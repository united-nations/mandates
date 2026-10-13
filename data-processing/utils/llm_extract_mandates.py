import json
import os
from typing import List, Tuple

from dotenv import load_dotenv
from joblib import Memory
from openai import AzureOpenAI, OpenAI
from pydantic import BaseModel, Field
from rich import print
from utils.cache import cache

load_dotenv()

api_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")

if not api_key or not azure_endpoint:
    raise ValueError(
        "Missing required environment variables in '.env' file: `AZURE_OPENAI_API_KEY` or `AZURE_OPENAI_ENDPOINT`."
    )

client = AzureOpenAI(
    azure_endpoint=azure_endpoint,
    api_version="2025-03-01-preview",
    api_key=api_key,
)

MODEL = "gpt-5.4"


class Mandate(BaseModel):
    mandate_context: str = Field(
        description="The exact sentence where the symbol was extracted from. Not the sentence following the symbol."
    )
    mandate_symbol: str = Field(
        description="The reference code exactly as in the text."
    )
    mandate_source: str = Field(
        description="The UN body or entity that issued the document."
    )


class MandateResponse(BaseModel):
    extracted_mandates: List[Mandate]


examples = [
    {
        "role": "user",
        "content": "19.2 The work of ESCAP is also grounded in its resolution 79/1, by which the Commission reaffirmed its commitment to promoting multilateralism and international cooperation, and its resolution 78/1, in which the Commission stressed its leadership role in catalysing regional cooperation and supporting actions to confront regional, transboundary and common challenges faced by its membership.",
    },
    {
        "role": "assistant",
        "content": json.dumps(
            {
                "extracted_mandates": [
                    {
                        "mandate_context": "The work of ESCAP is also grounded in its resolution 79/1, by which the Commission reaffirmed its commitment to promoting multilateralism and international cooperation, and its resolution 78/1, in which the Commission stressed its leadership role in catalysing regional cooperation and supporting actions to confront regional, transboundary and common challenges faced by its membership.",
                        "mandate_symbol": "79/1",
                        "mandate_source": "ESCAP",
                    },
                    {
                        "mandate_context": "The work of ESCAP is also grounded in its resolution 79/1, by which the Commission reaffirmed its commitment to promoting multilateralism and international cooperation, and its resolution 78/1, in which the Commission stressed its leadership role in catalysing regional cooperation and supporting actions to confront regional, transboundary and common challenges faced by its membership.",
                        "mandate_symbol": "78/1",
                        "mandate_source": "ESCAP",
                    },
                ]
            }
        ),
    },
    {
        "role": "user",
        "content": "The departments and offices under section 29 derive their mandates and guidance from relevant articles of the Charter of the United Nations, specifically Articles 100 and 101, as well as the Financial Regulations and Rules of the United Nations. They also refer to General Assembly resolutions as included in the relevant components.",
    },
    {
        "role": "assistant",
        "content": json.dumps(
            {
                "extracted_mandates": [
                    {
                        "mandate_context": "The departments and offices under section 29 derive their mandates and guidance from relevant articles of the Charter of the United Nations, specifically Articles 100 and 101, as well as the Financial Regulations and Rules of the United Nations.",
                        "mandate_symbol": "Article 100",
                        "mandate_source": "Charter of the United Nations",
                    },
                    {
                        "mandate_context": "The departments and offices under section 29 derive their mandates and guidance from relevant articles of the Charter of the United Nations, specifically Articles 100 and 101, as well as the Financial Regulations and Rules of the United Nations.",
                        "mandate_symbol": "Article 101",
                        "mandate_source": "Charter of the United Nations",
                    },
                ]
            }
        ),
    },
]

# -------------------------------------------------------------------------


@cache
def llm_extract_mandates(
    input_text: str, hyperlinks: List[Tuple[str, str]], model: str = MODEL
):
    for ht, hl in hyperlinks:
        input_text = input_text.replace(ht, f"~~{ht}~~")
    system_prompt = (
        "You are a UN Executive Office analyst with deep expertise in UN documents. "
        "Your task is to extract every clearly cited UN document reference verbatim, "
        "along with its issuing body and the full sentence where it appears. "
        "Only extract references that match UN citation patterns "
        '(e.g., "1261 (1999)", "76/274", "Article 8" [of the Charter of the United Nations], "Decision 51/43", "A/71/818", "E/RES/2019/1", "PRST/2015/4", etc.) '
        "Skip references that are wrapped in '~~' (e.g., '~~1261 (1999)~~'); these should not be extracted."
        "Do not extract sub-article references (e.g. 'article 5 of its Statute', 'paragraph 6 (A) (ii) of its statute') when they refer to internal provisions of an already-cited document rather than a separately citable mandate. "
        "Do not infer, guess or normalize any citation; skip any incomplete or ambiguous ones."
    )
    try:
        completion = client.responses.parse(
            model=model,
            input=[
                {"role": "system", "content": system_prompt},
                *examples,
                {"role": "user", "content": input_text},
            ],
            temperature=0.0,
            text_format=MandateResponse,
        )
        mandates = completion.output_parsed.extracted_mandates
        for mandate in mandates:
            mandate.mandate_context = mandate.mandate_context.replace("~~", "")
        return [m.model_dump() for m in mandates]
    except Exception as e:
        # if "child" in input_text:
        #     print(
        #         f"Please don't harm any children! And double-check the following section for background mandates: {input_text[:100]} ..."
        #     )
        #     return []
        # else:
        #     raise e
        raise e


if __name__ == "__main__":
    test = llm_extract_mandates(
        "19.2 The work of ESCAP is also grounded in its resolution 79/1, by which the Commission reaffirmed its commitment to promoting multilateralism and international cooperation, and its resolution 78/1, in which the Commission stressed its leadership role in catalysing regional cooperation and supporting actions to confront regional, transboundary and common challenges faced by its membership.",
        hyperlinks=[],
    )
    print(test)
