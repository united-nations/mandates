import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  synthesizeDlAnnotations,
  cleanAssignee,
} from '#lib/fulltext-annotations'
test('uses literal action rather than structural first word', () => {
  for (const [text, action, expected] of [
    ['We resolve to end poverty.', 'resolve', 'We *resolve* to end poverty.'],
    [
      'We also encourage Member States to act.',
      'encourage',
      'We also *encourage* Member States to act.',
    ],
    [
      'Eradicating poverty is an imperative. We decide to:',
      'decide to:',
      'Eradicating poverty is an imperative. We *decide* to:',
    ],
    [
      'Request the Secretary-General to report.',
      'Request',
      '*Request* the Secretary-General to report.',
    ],
  ])
    assert.equal(
      synthesizeDlAnnotations({ text, action_verb: action, lead_verb: 'We' })
        ?.textWithHighlights,
      expected
    )
})
test('gerund subjects and bare subjects/modals are not action highlights', () => {
  for (const action of ['Realizing', 'We', 'We will'])
    assert.equal(
      synthesizeDlAnnotations({
        text: `${action} equality will help.`,
        action_verb: action,
        paragraph_type: 'operative',
      }),
      null
    )
  assert.ok(
    synthesizeDlAnnotations({
      text: 'Recalling its resolution,',
      action_verb: 'Recalling',
      paragraph_type: 'preambular',
    })
  )
})
test('inherited verbs do not highlight incidental mentions', () => {
  assert.equal(
    synthesizeDlAnnotations({
      text: 'Support requests for assistance.',
      action_verb: 'requests',
      action_inherited: true,
    })?.textWithHighlights,
    undefined
  )
})
test('separates actors from context and abstract objects', () => {
  assert.equal(
    cleanAssignee(
      'the high-level political forum, under the auspices of the General Assembly'
    ),
    'the high-level political forum'
  )
  assert.equal(
    cleanAssignee(
      'strengthened international cooperation on the return or restitution of cultural properties'
    ),
    null
  )
  assert.equal(cleanAssignee('ongoing efforts by States in other forums'), null)
  assert.equal(cleanAssignee('all Member States'), 'all Member States')
})
