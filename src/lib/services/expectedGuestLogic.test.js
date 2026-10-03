import { describe, it, expect } from 'vitest';
import { extendGuestForecast } from './expectedGuestLogic.js';
import { attentionRows } from './followUpAttention.js';
describe('invitation forecasts and evidence', () => {
  it('keeps confirmed counts unchanged and deduplicates linked coming/tentative people', () => {
    const rows = [ { _id: 'one', person_id: 'known', state: 'coming' }, { _id: 'two', person_id: 'known', state: 'coming' }, { _id: 'unknown', state: 'coming', name_unknown: true }, { _id: 'tentative', state: 'tentative' }, { _id: 'duplicate-tentative', person_id: 'known', state: 'tentative' }, { _id: 'cancelled', state: 'cancelled' }, { _id: 'attended', state: 'coming', attendance_service_id: 'service' }, { _id: 'mistake', state: 'coming', entered_in_error: true } ];
    expect(extendGuestForecast({ confirmed_total: 1, expected_person_ids: ['known'] }, rows)).toMatchObject({ expected_total: 2, confirmed_total: 1, additional_expected_guests: 1, tentative_guest_count: 1, unnamed_expected_guests: 1, expected_guest_invitation_ids: ['unknown'] });
  });
  it('gives the expected total matching person and pending-invitation evidence', () => {
    const invitations = [{ _id: 'unlinked', state: 'coming', display_name: "Practice Layla's friend" }, { _id: 'linked', state: 'coming', person_id: 'nia', person: { _id: 'nia', first_name: 'Nia' } }];
    const forecast = extendGuestForecast({ expected_person_ids: [] }, invitations);
    const evidence = attentionRows({ attendance_forecast: forecast, guest_invitations: invitations }, 'expected-sunday', '2026-10-03');
    expect(evidence).toHaveLength(forecast.expected_total);
    expect(evidence.find(row => row._id === 'unlinked')).toMatchObject({ attention_kind: 'guest_invitation', name: "Practice Layla's friend" });
  });
});
