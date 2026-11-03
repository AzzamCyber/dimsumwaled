import finance from '@/lib/finance.cjs';
const { localDate, rupiah } = finance;
export default function RevenueChart({ transactions, expenses, startDate, endDate }) {
 const start = Date.parse(startDate + 'T00:00:00+07:00'), end = Date.parse(endDate + 'T00:00:00+07:00');
 const days = Math.max(1, Math.floor((end - start) / 86400000) + 1);
 const step = Math.max(1, Math.ceil(days / 31));
 const bins = Array.from({length: Math.ceil(days / step)}, (_, i) => ({ date: localDate(new Date(start + i * step * 86400000)), revenue: 0, expenses: 0 }));
 function index(value) { const at = Date.parse(localDate(value) + 'T00:00:00+07:00'); return Math.floor((at - start) / 86400000 / step); }
 transactions.forEach(t => { const i=index(t.created_at); if(bins[i]) bins[i].revenue += Number(t.total_amount); });
 expenses.forEach(e => { const i=index(e.date + 'T12:00:00+07:00'); if(bins[i]) bins[i].expenses += Number(e.amount); });
 const maximum = Math.max(10000, ...bins.flatMap(b => [b.revenue, b.expenses])) * 1.15;
 const x = i => 65 + (i / Math.max(1, bins.length - 1)) * 535;
 const y = n => 180 - (n / maximum) * 147;
 const points = key => bins.map((b,i) => `${x(i)},${y(b[key])}`).join(' ');
 const area = `M 65 180 L ${bins.map((b,i)=>`${x(i)} ${y(b.revenue)}`).join(' L ')} L ${x(bins.length-1)} 180 Z`;
 const labels = [...new Set([0,Math.floor((bins.length-1)/3),Math.floor((bins.length-1)*2/3),bins.length-1])];
 return <div className="chart-wrap"><svg viewBox="0 0 620 220" role="img" aria-label="Grafik pemasukan dan biaya operasional pada periode terpilih">
  <defs><linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9844f" stopOpacity=".19"/><stop offset="100%" stopColor="#e9844f" stopOpacity=".01"/></linearGradient></defs>
  {[0,1,2,3].map(i => {const amount=maximum*i/3;return <g key={i}><line x1="65" x2="600" y1={y(amount)} y2={y(amount)} stroke="#eee7dd" strokeDasharray="3 4"/><text x="53" y={y(amount)+3} textAnchor="end" fill="#b5a590" fontSize="8">{amount>=1000000?(amount/1000000).toFixed(1)+' jt':amount>=1000?Math.round(amount/1000)+' rb':'0'}</text></g>;})}
  <path d={area} fill="url(#income-fill)"/><polyline points={points('expenses')} fill="none" stroke="#9ba98f" strokeWidth="2" strokeLinejoin="round"/><polyline points={points('revenue')} fill="none" stroke="#e2834c" strokeWidth="2.4" strokeLinejoin="round"/>
  {bins.map((b,i) => <circle key={i} cx={x(i)} cy={y(b.revenue)} r={bins.length<10?3:1.8} fill="#e2834c"><title>{b.date}: {rupiah(b.revenue)}</title></circle>)}
  {labels.map(i=><text key={i} x={x(i)} y="207" textAnchor="middle" fill="#b5a590" fontSize="8">{new Date(bins[i].date+'T12:00:00+07:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',timeZone:'Asia/Jakarta'})}</text>)}
 </svg></div>;
}
