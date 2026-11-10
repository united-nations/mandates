"""Safeguards for the paid experiment and source-bound extraction contract."""
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE));sys.path.insert(1,str(HERE.parent))
import schema
spec=importlib.util.spec_from_file_location('experiment_runner',HERE/'run.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)

class BudgetTests(unittest.TestCase):
    def test_cap_is_shared_and_unknown_outcomes_keep_reservation(self):
        with tempfile.TemporaryDirectory() as td, patch.object(runner,'OUT',Path(td)):
            runner.reserve('first',20)
            with self.assertRaisesRegex(ValueError,'cap'):runner.reserve('second',6)
            with self.assertRaisesRegex(ValueError,'already'):runner.reserve('first',1)
            ledger=json.loads((Path(td)/'ledger.json').read_text())
            self.assertEqual(ledger['requests']['first']['charged_bound_usd'],20)
            runner.reserve('first',0,{'status':'completed','charged_bound_usd':1})
            runner.reserve('second',6)
            self.assertEqual(len(json.loads((Path(td)/'ledger.json').read_text())['requests']),2)

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.case={'input':{'document':{'issuer':{'normalized_name':'GA','aliases':['General Assembly']}},'target':[{'ref':'p1','text':'Requests the Secretary-General to prepare a report.'}],'context':[{'ref':'p0','text':'Notes the earlier report.'}]}}
        self.data={'tasks':[{'summary':'Prepare a report','family':'reporting','subtype':'written_report','statement_kind':'assignment','evidence':{'paragraph_ref':'p1','quote':'prepare a report','occurrence':0},'highlight':{'paragraph_ref':'p1','quote':'prepare a report','occurrence':0},'actors':[],'qualifications':[],'outputs':[],'institutional_target':None}],'omissions':[],'uncertainties':[]}
    def test_issuer_cannot_be_implementation_assignee_or_decide_an_assignment(self):
        self.data['tasks'][0]['actors']=[{'name':'GA','entity_type':'un_organs','role':'implementer','basis':'issuing_body','evidence':None}]
        with self.assertRaisesRegex(ValueError,'issuer'):schema.validate(self.data,self.case)
        self.data['tasks'][0]['actors'][0]['role']='decision_maker'
        with self.assertRaisesRegex(ValueError,'decision maker'):schema.validate(self.data,self.case)
    def test_context_omissions_and_synthetic_quotes_rejected(self):
        self.data['omissions']=[{'reason':'historical_reference','evidence':{'paragraph_ref':'p0','quote':'Notes','occurrence':0}}]
        with self.assertRaisesRegex(ValueError,'outside target'):schema.validate(self.data,self.case)
        self.data['omissions']=[];self.data['tasks'][0]['highlight']['quote']='prepare ... report'
        with self.assertRaisesRegex(ValueError,'quote/occurrence'):schema.validate(self.data,self.case)
    def test_short_display_and_full_evidence_resolve(self):
        self.data['tasks'][0]['evidence']['quote']=self.case['input']['target'][0]['text']
        self.assertEqual(len(schema.validate(self.data,self.case)['tasks']),1)
if __name__=='__main__':unittest.main()
