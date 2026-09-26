import { createChoice, createSelection } from './selection.js';
import { serviceId } from './serviceAdapter.js';

/** Bind a page-owned service cohort to a chart/comparison choice. */
export function bindServiceSources(selection, services) {
  const ids = services.map(serviceId);
  return { ...selection, choices: selection.choices.map(choice => ({
    ...choice,
    sourceIds: choice.sourceIds?.length ? choice.sourceIds : ids,
  })) };
}

export function periodServiceSelection(metricKey, services, { mode = 'total', range = null, filters = {} } = {}) {
  const ids = services.map(serviceId);
  const choice = createChoice({ domain: 'service', metricKey, mode, point: {
    date: range?.startDate || null, bucketStart: range?.startDate || null, bucketEnd: range?.endDate || null,
    sourcePoints: services.map(service => ({ id: serviceId(service), date: service.service_date })),
  }, filters });
  choice.sourceIds = ids;
  return createSelection([choice], 'A');
}
