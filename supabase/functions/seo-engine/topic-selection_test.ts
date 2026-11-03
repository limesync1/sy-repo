import { assertEquals } from 'jsr:@std/assert@1';
import { topicIndustry, selectTopic } from './topic-selection.ts';
const high = { id: '1', keyword: 'system til privatrengøring', score: 100 };
const small = { id: '2', keyword: 'rens af solfangere – planlægning for firmaer', score: 40 };
Deno.test('subtrade resolves to solcellerens parent', () => assertEquals(topicIndustry(small), 'solcellerens'));
Deno.test('demand slot keeps highest score', () => assertEquals(selectTopic([small, high], [high], false)?.id, '1'));
Deno.test('coverage slot chooses uncovered small trade', () => assertEquals(selectTopic([high, small], [high], true)?.id, '2'));
Deno.test('coverage slot falls back when no mapped trades remain', () => assertEquals(selectTopic([{ id: '3', keyword: 'ukendt', score: 1 }], [], true)?.id, '3'));
Deno.test('explicit target resolves short ambiguous subtrade', () => assertEquals(topicIndustry({ keyword: 'ovn', target_path: '/software/branche/hvidevarereparation' }), 'hvidevarereparation'));