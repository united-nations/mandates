"""V5 source evidence contract; display spans are never the full evidence by default."""

from typing import Literal
from pydantic import Field
from activity_schema import (
    StrictModel,
    Evidence,
    EntityType,
    ActivitySubtype,
    ACTIVITY_SUBTYPES,
    DeliverableKind,
    InstitutionalTarget,
    evidence_offsets,
)


class Actor(StrictModel):
    name: str
    entity_type: EntityType | None
    role: Literal["implementer", "decision_maker", "commitment_maker"]
    basis: Literal["explicit", "inherited", "issuing_body"]
    evidence: Evidence | None


class Qualification(StrictModel):
    kind: Literal["condition", "deadline", "frequency", "duration", "scope"]
    evidence: Evidence


class Output(StrictModel):
    kind: DeliverableKind
    description: str
    basis: Literal["explicit", "inherited"]
    evidence: Evidence
    highlight: Evidence | None


class Task(StrictModel):
    summary: str
    family: Literal[
        "substantive",
        "reporting",
        "deliberation",
        "institutional",
        "resources",
        "mandate_review",
    ]
    subtype: ActivitySubtype
    statement_kind: Literal["assignment", "adopted_decision", "self_commitment"]
    status: Literal["new", "reaffirmed"]
    evidence: list[Evidence] = Field(min_length=1)
    highlights: list[Evidence] = Field(max_length=2)
    actors: list[Actor]
    methods: list[Evidence]
    qualifications: list[Qualification]
    outputs: list[Output]
    institutional_target: InstitutionalTarget | None


class Omission(StrictModel):
    reason: Literal[
        "historical_reference",
        "acknowledgment",
        "general_intent",
        "procedural_possibility",
        "insufficient_source",
    ]
    evidence: Evidence


class Extraction(StrictModel):
    tasks: list[Task]
    omissions: list[Omission]
    uncertainties: list[str]


def validate(data, case):
    result = Extraction.model_validate(data)
    sources = {
        p["ref"]: p["text"] for p in case["input"]["target"] + case["input"]["context"]
    }
    targets = {p["ref"] for p in case["input"]["target"]}
    issuer = case["input"]["document"]["issuer"]
    aliases = {issuer["normalized_name"], *issuer["aliases"]}

    def resolve(e, target_only=False):
        if target_only and e.paragraph_ref not in targets:
            raise ValueError("display/explicit evidence outside target")
        return evidence_offsets(e, sources)

    def contained(e, support):
        return any(
            s["paragraph_ref"] == e["paragraph_ref"]
            and s["start"] <= e["start"] < e["end"] <= s["end"]
            for s in support
        )

    for task in result.tasks:
        if task.subtype not in ACTIVITY_SUBTYPES[task.family]:
            raise ValueError("family/subtype mismatch")
        support = [resolve(e) for e in task.evidence]
        if not any(e.paragraph_ref in targets for e in task.evidence):
            raise ValueError("task lacks target evidence")
        for e in task.highlights:
            r = resolve(e, True)
            if not contained(r, support):
                raise ValueError("task highlight outside supporting evidence")
            if len(e.quote.split()) > 32:
                raise ValueError("task display phrase exceeds 32 words")
        if (
            task.family in ("institutional", "mandate_review")
            and task.institutional_target is None
        ):
            raise ValueError("institutional target required")
        if task.institutional_target:
            resolve(task.institutional_target.evidence)
        for actor in task.actors:
            if actor.name.strip().lower() in ("we", "itself", "unknown", "other", ""):
                raise ValueError("unresolved pronoun/placeholder actor")
            if (
                actor.role == "decision_maker"
                and task.statement_kind != "adopted_decision"
            ):
                raise ValueError("decision maker on nondecision")
            if (
                actor.role == "commitment_maker"
                and task.statement_kind != "self_commitment"
            ):
                raise ValueError("commitment maker on noncommitment")
            if actor.basis == "issuing_body":
                if (
                    actor.role not in ("decision_maker", "commitment_maker")
                    or actor.name not in aliases
                    or actor.evidence is not None
                ):
                    raise ValueError("invalid implicit issuer role")
            else:
                if actor.evidence is None:
                    raise ValueError("actor lacks source evidence")
                resolve(actor.evidence, actor.basis == "explicit")
        for output in task.outputs:
            r = resolve(output.evidence, output.basis == "explicit")
            if output.highlight:
                h = resolve(output.highlight, True)
                if not contained(h, [r]):
                    raise ValueError("output highlight outside output evidence")
                if len(output.highlight.quote.split()) > 20:
                    raise ValueError("output display phrase exceeds 20 words")
        for e in task.methods:
            resolve(e)
        for q in task.qualifications:
            resolve(q.evidence)
    for omission in result.omissions:
        resolve(omission.evidence, True)
    return result.model_dump()
