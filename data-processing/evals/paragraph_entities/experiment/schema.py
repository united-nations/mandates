"""Experimental extraction schema: implementation roles and display spans are separate."""
from typing import Literal
from pydantic import Field
from activity_schema import StrictModel, Evidence, ActivitySubtype, EntityType, ACTIVITY_SUBTYPES, evidence_offsets, Deliverable, InstitutionalTarget

class Actor(StrictModel):
    name: str
    entity_type: EntityType
    role: Literal['implementer', 'decision_maker']
    basis: Literal['explicit', 'inherited', 'issuing_body']
    evidence: Evidence | None

class Qualification(StrictModel):
    kind: Literal['condition', 'deadline', 'frequency', 'duration', 'scope']
    evidence: Evidence

class Task(StrictModel):
    summary: str
    family: Literal['substantive','reporting','deliberation','institutional','resources','mandate_review']
    subtype: ActivitySubtype
    statement_kind: Literal['assignment','adopted_decision']
    evidence: Evidence
    highlight: Evidence
    actors: list[Actor]
    qualifications: list[Qualification]
    outputs: list[Deliverable]
    institutional_target: InstitutionalTarget | None

class Omission(StrictModel):
    reason: Literal['historical_reference','acknowledgment','general_intent','insufficient_source']
    evidence: Evidence

class Extraction(StrictModel):
    tasks: list[Task]
    omissions: list[Omission]
    uncertainties: list[str]

def validate(data, case):
    value=Extraction.model_validate(data)
    sources={p['ref']:p['text'] for p in case['input']['target']+case['input']['context']}
    target={p['ref'] for p in case['input']['target']}
    for t in value.tasks:
        if t.subtype not in ACTIVITY_SUBTYPES[t.family]:raise ValueError('family/subtype mismatch')
        for e in [t.evidence,t.highlight]:
            if e.paragraph_ref not in target:raise ValueError('task must be in target')
            evidence_offsets(e,sources)
        support=evidence_offsets(t.evidence,sources);display=evidence_offsets(t.highlight,sources)
        if support['paragraph_ref']!=display['paragraph_ref'] or not support['start']<=display['start']<display['end']<=support['end']:raise ValueError('highlight outside supporting evidence')
        for out in t.outputs:
            if out.evidence.paragraph_ref not in target:raise ValueError('output outside target')
            evidence_offsets(out.evidence,sources)
        if t.family in ('institutional','mandate_review') and t.institutional_target is None:raise ValueError('institutional target required')
        if t.institutional_target:evidence_offsets(t.institutional_target.evidence,sources)
        for a in t.actors:
            if a.role=='decision_maker' and t.statement_kind!='adopted_decision':raise ValueError('decision maker on assignment')
            if a.basis=='explicit' and (not a.evidence or a.evidence.paragraph_ref not in target):raise ValueError('explicit actor outside target')
            if a.basis=='issuing_body':
                if a.role!='decision_maker' or a.evidence is not None or a.name not in [case['input']['document']['issuer']['normalized_name'],*case['input']['document']['issuer']['aliases']]:raise ValueError('invalid issuer actor')
            elif a.evidence is None:raise ValueError('actor requires evidence')
            else:evidence_offsets(a.evidence,sources)
        for q in t.qualifications:evidence_offsets(q.evidence,sources)
    for o in value.omissions:
        if o.evidence.paragraph_ref not in target:raise ValueError('omission outside target')
        evidence_offsets(o.evidence,sources)
    return value.model_dump()
