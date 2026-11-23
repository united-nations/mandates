"""V5 quality checks using the original experiment's shared locked budget guard."""

import argparse, asyncio, hashlib, importlib.util, json, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent), str(HERE.parent / "experiment")]
from experiment import run as original
from activity_schema import ParagraphActivities
from openai import AsyncAzureOpenAI
from dotenv import dotenv_values
from openai.lib._pydantic import to_strict_json_schema

spec = importlib.util.spec_from_file_location("quality_schema", HERE / "schema.py")
contract = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = contract
spec.loader.exec_module(contract)


def load(p):
    return json.loads(Path(p).read_text())


def save(p, d):
    original.save(p, d)


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


async def run(args):
    out = Path(args.out)
    original.OUT = out
    cases = [
        c
        for c in load(out / "cases.json")
        if c["split"] == args.split and (not args.ids or c["id"] in args.ids.split(","))
    ]
    if args.variant == "baseline":
        ref = HERE.parents[3] / "data/references/extraction-experiment-20261110"
        prompt = (ref / "baseline-developer.txt").read_text()
        schema = load(ref / "baseline-schema.json")
    else:
        prompt = (HERE / ("prompt-" + args.variant + ".txt")).read_text()
        schema = to_strict_json_schema(contract.Extraction)
    cfg = dict(
        prompt=prompt,
        schema=schema,
        model=args.model,
        reasoning="medium",
        max_output_tokens=12288,
    )
    config_sha = sha(json.dumps(cfg, sort_keys=True))
    dest = out / "runs" / args.variant / args.model / args.split
    if (dest / "config.json").exists():
        assert load(dest / "config.json")["sha256"] == config_sha
    save(dest / "config.json", {**cfg, "sha256": config_sha})
    if args.split == "test":
        frozen = load(out / "freeze.json")
        assert frozen["cases_sha256"] == sha((out / "cases.json").read_text())
        assert frozen["prompt_sha256"] == sha((HERE / "prompt-v6.txt").read_text())
        assert frozen["schema_sha256"] == sha(
            json.dumps(to_strict_json_schema(contract.Extraction), sort_keys=True)
        )
        assert frozen["gold_sha256"] == sha((out / "gold-test.json").read_text())
    env = dotenv_values(args.env_file)
    client = AsyncAzureOpenAI(
        azure_endpoint=env["AZURE_OPENAI_ENDPOINT"],
        api_key=env["AZURE_OPENAI_API_KEY"],
        api_version=env.get("AZURE_OPENAI_API_VERSION", "2025-03-01-preview"),
        max_retries=0,
        timeout=180,
    )
    sem = asyncio.Semaphore(4)
    rates = original.RATES[args.model]

    async def one(c):
        p = dest / (c["id"] + ".json")
        if p.exists():
            return
        async with sem:
            body = dict(
                model=args.model,
                reasoning={"effort": "medium"},
                input=[
                    dict(role="developer", content=prompt),
                    dict(
                        role="user", content=json.dumps(c["input"], ensure_ascii=False)
                    ),
                ],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "MandateTasks",
                        "strict": True,
                        "schema": schema,
                    }
                },
                max_output_tokens=12288,
                store=False,
            )
            input_bound = len(json.dumps(body, ensure_ascii=False).encode()) + 1024
            assert input_bound < 272000
            reservation = (input_bound * rates[0] + 12288 * rates[1]) / 1e6 * 1.25
            key = "/".join(
                ["quality-20261123", args.variant, args.model, args.split, c["id"]]
            )
            original.reserve(key, reservation)
            start = time.monotonic()
            r = dict(
                case_id=c["id"],
                symbol=c["symbol"],
                position=c["position"],
                config_sha256=config_sha,
                source_sha256=c["source_sha256"],
            )
            try:
                response = await client.responses.create(**body)
                raw = response.model_dump()
                save(dest / "raw" / (c["id"] + ".json"), raw)
                u = raw.get("usage") or {}
                cost = (
                    u.get("input_tokens", 0) * rates[0]
                    + u.get("output_tokens", 0) * rates[1]
                ) / 1e6
                original.reserve(
                    key,
                    0,
                    dict(
                        status=raw.get("status"),
                        usage=u,
                        uncached_list_cost_usd=cost,
                        charged_bound_usd=(
                            cost * 1.25
                            if u.get("input_tokens") is not None
                            else reservation
                        ),
                        response_model=raw.get("model"),
                    ),
                )
                r.update(usage=u, cost_usd=cost)
                if raw.get("status") != "completed":
                    raise ValueError("Incomplete response")
                if args.variant == "baseline":
                    r["output"] = original.validate_response(
                        raw, {"input": c["input"]}
                    )["parsed"]
                else:
                    msgs = [m for m in raw["output"] if m.get("type") == "message"]
                    final = [m for m in msgs if m.get("phase") == "final_answer"]
                    msgs = final or msgs
                    text = "".join(
                        x["text"]
                        for m in msgs
                        for x in m["content"]
                        if x["type"] == "output_text"
                    )
                    r["output"] = contract.validate(json.loads(text), c)
                r["valid"] = True
            except Exception as e:
                r.update(valid=False, error=type(e).__name__, detail=str(e)[:600])
            r["elapsed_seconds"] = time.monotonic() - start
            save(p, r)
            print(
                args.variant,
                args.model,
                c["id"],
                r["valid"],
                r.get("detail", ""),
                flush=True,
            )

    await asyncio.gather(*(one(c) for c in cases))
    await client.close()
    ledger = load(out / "ledger.json")
    print(
        "CUMULATIVE BUDGET BOUND",
        sum(r["charged_bound_usd"] for r in ledger["requests"].values()),
        flush=True,
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--variant", choices=["baseline", "v6"], required=True)
    p.add_argument(
        "--model", choices=["gpt-6-luna", "gpt-6.1-sol"], default="gpt-6-luna"
    )
    p.add_argument("--split", choices=["development", "test"], required=True)
    p.add_argument("--ids")
    p.add_argument("--env-file", default="/home/agent/transcripts/.env")
    asyncio.run(run(p.parse_args()))
