import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import MetricComparison from './MetricComparison.svelte';
import MeetingBarChart from './MeetingBarChart.svelte';
afterEach(cleanup);

describe('shared dashboard comparisons', () => {
  it('compares the same metric as a total and decimal average and opens details', async () => {
    const {getByLabelText,getByRole}=render(MetricComparison,{metrics:[{key:'attendance',label:'Attendance',total:31,denominator:3,averageLabel:'Average per service'}]});
    await fireEvent.change(getByLabelText('Comparison metric'),{target:{value:'attendance'}});
    expect(getByRole('button',{name:/Series A · Attendance/})).toHaveTextContent('31');
    expect(getByRole('button',{name:/Series B · Attendance/})).toHaveTextContent('10.3');
    await fireEvent.click(getByRole('button',{name:/Series B · Attendance/}));
    expect(getByRole('dialog',{name:'Attendance'})).toHaveTextContent('Average per service10.3');
    expect(getByRole('dialog',{name:'Attendance'})).toHaveTextContent('Denominator3');
  });
  it('can round people averages to whole numbers for headcount dashboards', async () => {
    const {getByLabelText,getByRole}=render(MetricComparison,{metrics:[{key:'attendance',label:'Attendance',total:31,denominator:3,averageLabel:'Average per service'}],wholeNumberAverages:true});
    await fireEvent.change(getByLabelText('Primary calculation'),{target:{value:'average'}});
    expect(getByRole('button',{name:/Series A · Attendance/})).toHaveTextContent('10');
    expect(getByRole('button',{name:/Series A · Attendance/})).not.toHaveTextContent('10.3');
    await fireEvent.click(getByRole('button',{name:/Series A · Attendance/}));
    expect(getByRole('dialog',{name:'Attendance'})).toHaveTextContent('Average per service10');
  });
  it('resets unsupported averages and invalid metric selections when switching dashboard scope', async () => {
    const {getByLabelText,getByRole,rerender}=render(MetricComparison,{metrics:[{key:'a',label:'Attendance',total:20,denominator:2,averageLabel:'Average per service'},{key:'people',label:'Unique people',total:12}]});
    await fireEvent.change(getByLabelText('Primary calculation'),{target:{value:'average'}});
    await fireEvent.change(getByLabelText('Primary metric'),{target:{value:'people'}});
    expect(getByLabelText('Primary calculation').value).toBe('total');
    expect(getByRole('option',{name:'Average not applicable'})).toBeDisabled();
    await fireEvent.change(getByLabelText('Comparison metric'),{target:{value:'a'}});
    await rerender({metrics:[{key:'care',label:'Care visits',total:3,denominator:0,averageLabel:'Average per day'}]});
    expect(getByLabelText('Primary metric').value).toBe('care');
    expect(getByLabelText('Comparison metric').value).toBe('');
    await fireEvent.change(getByLabelText('Primary calculation'),{target:{value:'average'}});
    expect(getByRole('button',{name:/Series A · Care visits/})).toHaveTextContent('Unavailable');
  });
  it('compares programme attendance average with its actual total without rounding source counts', async () => {
    const {getByLabelText,getByRole}=render(MeetingBarChart,{data:[{id:'a',label:'Prayer',total:31,meetingCount:3}],metricOptions:[{key:'uniquePeople',label:'Unique people'}]});
    await fireEvent.change(getByLabelText('Comparison metric'),{target:{value:'attendance'}});
    const row=getByRole('button',{name:'Prayer. View meeting comparison details.'});
    expect(row).toHaveTextContent('10.3');
    expect(row).toHaveTextContent('31');
    await fireEvent.click(row);
    expect(getByRole('dialog',{name:'Prayer'})).toHaveTextContent('actual count31');
  });
});
