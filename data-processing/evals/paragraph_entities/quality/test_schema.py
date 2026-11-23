import importlib.util, sys, unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
spec = importlib.util.spec_from_file_location("quality_contract", HERE / "schema.py")
contract = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = contract
spec.loader.exec_module(contract)


def evidence(ref, quote):
    return dict(paragraph_ref=ref, quote=quote, occurrence=0)


class SchemaTests(unittest.TestCase):
    def setUp(self):
        self.case = {
            "input": {
                "document": {
                    "issuer": {
                        "normalized_name": "HRC",
                        "aliases": ["Human Rights Council"],
                    }
                },
                "target": [
                    {
                        "ref": "child",
                        "text": "Provide an overview of national measures.",
                    }
                ],
                "context": [
                    {
                        "ref": "parent",
                        "text": "Requests OHCHR to prepare a report by June.",
                    }
                ],
            }
        }
        self.task = dict(
            summary="Include overview in parent report",
            family="reporting",
            subtype="written_report",
            statement_kind="assignment",
            status="new",
            evidence=[evidence("child", "Provide an overview of national measures.")],
            highlights=[evidence("child", "Provide an overview")],
            actors=[],
            methods=[],
            qualifications=[],
            outputs=[],
            institutional_target=None,
        )

    def validate(self):
        return contract.validate(
            dict(tasks=[self.task], omissions=[], uncertainties=[]), self.case
        )

    def test_parent_output_is_allowed_but_cannot_be_painted_as_child_text(self):
        self.task["outputs"] = [
            dict(
                kind="report",
                description="Parent report",
                basis="inherited",
                evidence=evidence("parent", "a report"),
                highlight=None,
            )
        ]
        self.assertEqual(len(self.validate()["tasks"]), 1)
        self.task["outputs"][0]["highlight"] = evidence("parent", "a report")
        with self.assertRaisesRegex(ValueError, "outside target"):
            self.validate()

    def test_display_is_bounded_and_source_verified(self):
        self.task["highlights"] = [evidence("child", "Provide")] * 3
        with self.assertRaises(ValueError):
            self.validate()
        self.task["highlights"] = [evidence("child", "Provide ... measures")]
        with self.assertRaisesRegex(ValueError, "quote/occurrence"):
            self.validate()

    def test_unknown_actor_type_is_preserved_without_inventing_un_membership(self):
        self.case["input"]["context"][0][
            "text"
        ] = "Requests relevant intergovernmental bodies to prepare a report."
        self.task["actors"] = [
            dict(
                name="Relevant intergovernmental bodies",
                entity_type=None,
                role="implementer",
                basis="inherited",
                evidence=evidence("parent", "relevant intergovernmental bodies"),
            )
        ]
        self.assertIsNone(self.validate()["tasks"][0]["actors"][0]["entity_type"])

    def test_issuer_must_not_be_implicit_implementer(self):
        self.task["actors"] = [
            dict(
                name="HRC",
                entity_type="un_organs",
                role="implementer",
                basis="issuing_body",
                evidence=None,
            )
        ]
        with self.assertRaisesRegex(ValueError, "issuer"):
            self.validate()
        self.task["statement_kind"] = "self_commitment"
        self.task["actors"][0]["role"] = "commitment_maker"
        self.assertEqual(
            self.validate()["tasks"][0]["actors"][0]["role"], "commitment_maker"
        )


class DisplayTests(unittest.TestCase):
    def test_verification_evidence_is_not_a_display_span(self):
        sys.path.insert(0, str(HERE))
        from display import display_spans

        case = {
            "input": {
                "target": [
                    {"ref": "p", "text": "😀 Requests States to submit a report."}
                ],
                "context": [],
            }
        }
        task = dict(
            summary="Submit report",
            family="reporting",
            subtype="written_report",
            evidence=[evidence("p", "😀 Requests States to submit a report.")],
            highlights=[evidence("p", "submit a report")],
            actors=[
                dict(
                    name="States",
                    entity_type="member_states",
                    role="implementer",
                    evidence=evidence("p", "States"),
                ),
                dict(
                    name="GA",
                    entity_type="un_organs",
                    role="decision_maker",
                    evidence=None,
                ),
            ],
            outputs=[
                dict(
                    kind="report",
                    description="Report",
                    highlight=evidence("p", "a report"),
                )
            ],
        )
        spans = display_spans({"tasks": [task, task]}, case)
        self.assertEqual(len(spans), 3)
        self.assertEqual(
            spans[0]["start"], 22
        )  # Unicode code points before submit=21, UTF-16 units=22
        self.assertEqual(
            [s["kind"] for s in spans], ["activity", "assignee", "deliverable"]
        )
        self.assertTrue(all(s["start"] > 0 for s in spans))


if __name__ == "__main__":
    unittest.main()
