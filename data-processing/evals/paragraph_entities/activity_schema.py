"""First-pilot activity contract and source-evidence validation (no verb output)."""
from __future__ import annotations
import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

ACTIVITY_SUBTYPES = {
    'substantive': ('policy_normative_action', 'technical_assistance', 'capacity_building', 'operational_delivery', 'humanitarian_delivery', 'information_knowledge_work'),
    'reporting': ('written_report', 'oral_briefing', 'update', 'assessment', 'recommendations'),
    'deliberation': ('meeting', 'dialogue_consultation', 'conference', 'agenda_consideration', 'participation'),
    'institutional': ('establishment', 'renewal_extension', 'amendment', 'termination', 'appointment_membership'),
    'resources': ('funding', 'personnel', 'facilities_infrastructure'),
    'mandate_review': ('mandate_review', 'evaluation', 'consolidation'),
}
EntityType = Literal['un_organs', 'un_secretariat', 'un_system', 'member_states', 'other']
DeliverableKind = Literal['report','briefing','update','information_sharing','analysis','recommendations','meeting','review','legislation','policy','strategy','standards','financial_resources','capacity_building','technical_assistance','humanitarian_assistance','infrastructure']
ActivitySubtype = Literal['policy_normative_action','technical_assistance','capacity_building','operational_delivery','humanitarian_delivery','information_knowledge_work','written_report','oral_briefing','update','assessment','recommendations','meeting','dialogue_consultation','conference','agenda_consideration','participation','establishment','renewal_extension','amendment','termination','appointment_membership','funding','personnel','facilities_infrastructure','mandate_review','evaluation','consolidation']

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Evidence(StrictModel):
    paragraph_ref: str
    quote: str
    occurrence: int = Field(ge=0)

class Assignee(StrictModel):
    normalized_name: str
    entity_type: EntityType | None
    basis: Literal['explicit','inherited','implicit']
    evidence: Evidence | None

class MentionedEntity(StrictModel):
    normalized_name: str
    entity_type: EntityType | None
    evidence: Evidence

class Deliverable(StrictModel):
    kind: DeliverableKind
    description: str
    evidence: Evidence

class InstitutionalTarget(StrictModel):
    normalized_name: str
    target_kind: Literal['entity','mission','mechanism','mandate']
    evidence: Evidence

class Activity(StrictModel):
    activity_type: Literal['substantive','reporting','deliberation','institutional','resources','mandate_review']
    activity_subtype: ActivitySubtype
    evidence: list[Evidence] = Field(min_length=1)
    assignees: list[Assignee]
    deliverables: list[Deliverable]
    institutional_target: InstitutionalTarget | None

# Encode the hierarchy in JSON Schema so incompatible type/subtype pairs
# cannot pass structured-output decoding.
from pydantic import create_model
ActivityVariants = tuple(
    create_model(
        key.title().replace('_', '') + 'Activity',
        __base__=Activity,
        activity_type=(Literal[key], ...),
        activity_subtype=(Literal[values], ...),
    )
    for key, values in ACTIVITY_SUBTYPES.items()
)
from typing import Union
TypedActivity = Union[ActivityVariants]

class Uncertainty(StrictModel):
    field: str
    reason: str

class ParagraphActivities(StrictModel):
    activities: list[TypedActivity]
    mentioned_entities: list[MentionedEntity]
    uncertainties: list[Uncertainty]


def evidence_offsets(evidence: Evidence, sources: dict[str,str]) -> dict:
    """Resolve exact evidence; whitespace-only changes may align back to source.

    Never normalize spelling, punctuation, case or substantive words. Returned
    offsets refer to the untouched source, and original quotes are retained.
    """
    if evidence.paragraph_ref not in sources:
        raise ValueError(f'unknown paragraph_ref {evidence.paragraph_ref}')
    if not evidence.quote.strip():
        raise ValueError('empty evidence quote')
    source = sources[evidence.paragraph_ref]
    hits = list(re.finditer(re.escape(evidence.quote), source))
    normalized = False
    if not hits:
        # Model output commonly changes NBSPs/newlines to ordinary spaces.
        words = re.split(r'\s+', evidence.quote.strip())
        hits = list(re.finditer(r'\s+'.join(re.escape(w) for w in words), source))
        normalized = True
    if evidence.occurrence >= len(hits):
        raise ValueError(f'quote/occurrence not in {evidence.paragraph_ref}: {evidence.quote[:100]!r}')
    match = hits[evidence.occurrence]
    return dict(paragraph_ref=evidence.paragraph_ref, start=match.start(), end=match.end(),
                quote=source[match.start():match.end()], output_quote=evidence.quote,
                whitespace_aligned=normalized)


def validate_output(data: dict, task: dict) -> dict:
    """Validate schema, hierarchy and evidence against this request's frozen input."""
    parsed = ParagraphActivities.model_validate(data)
    sources = {p['ref']:p['text'] for p in task['input']['target'] + task['input']['context']}
    target_refs = {p['ref'] for p in task['input']['target']}
    spans = []
    def evidence(e: Evidence, allowed: set[str] | None = None):
        if allowed is not None and e.paragraph_ref not in allowed:
            raise ValueError('evidence outside permitted target/context scope')
        resolved = evidence_offsets(e,sources)
        spans.append(resolved)
        return resolved
    issuer = task['input']['document']['issuer']
    issuer_aliases = set(issuer['aliases'] + [issuer['normalized_name']])
    for activity in parsed.activities:
        if activity.activity_subtype not in ACTIVITY_SUBTYPES[activity.activity_type]:
            raise ValueError('activity type/subtype mismatch')
        if not any(e.paragraph_ref in target_refs for e in activity.evidence):
            raise ValueError('activity lacks evidence in target paragraph')
        for e in activity.evidence: evidence(e)
        for actor in activity.assignees:
            if actor.normalized_name.strip().lower() in ('we','other','unknown',''):
                raise ValueError('unusable normalized actor name')
            if actor.basis == 'implicit':
                if actor.evidence is not None or actor.normalized_name not in issuer_aliases:
                    raise ValueError('implicit actor must be the issuing body with null quote evidence')
            else:
                if actor.evidence is None: raise ValueError('explicit/inherited actor lacks evidence')
                if actor.evidence.quote.strip().lower() == 'we': raise ValueError('pronoun used as actor evidence')
                evidence(actor.evidence, target_refs if actor.basis=='explicit' else None)
        for output in activity.deliverables: evidence(output.evidence,target_refs)
        if activity.institutional_target is not None: evidence(activity.institutional_target.evidence)
        if activity.activity_type in ('institutional','mandate_review') and activity.institutional_target is None:
            raise ValueError('institutional/review activity lacks its affected target')
    for entity in parsed.mentioned_entities: evidence(entity.evidence,target_refs)
    return dict(parsed=parsed.model_dump(), evidence_spans=spans,
                whitespace_alignments=sum(s['whitespace_aligned'] for s in spans))
