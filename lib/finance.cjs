function totals(data) {
 const sales = (data.transactions || []).filter(t => !t.status || t.status === 'COMPLETED');
 const revenue = sales.reduce((sum, t) => sum + Number(t.total_amount), 0);
 const cogs = sales.flatMap(t => t.transaction_items || []).reduce((sum, i) => sum + Number(i.base_price || 0) * Number(i.quantity), 0);
 const expenses = (data.expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
 const purchases = (data.purchases || []).filter(p => !p.status || p.status === 'COMPLETED').reduce((sum, p) => sum + Number(p.total_amount), 0);
 return { revenue, cogs, expenses, purchases, grossProfit: revenue - cogs, netProfit: revenue - cogs - expenses, cashFlow: revenue - expenses - purchases, transactions: sales.length };
}
function perBranch(data) {
 return (data.branches || []).map(branch => ({ ...branch, ...totals({
  transactions: data.transactions.filter(t => t.branch_id === branch.id),
  expenses: data.expenses.filter(e => e.branch_id === branch.id),
  purchases: (data.purchases || []).filter(p => p.branch_id === branch.id),
 }) }));
}
const rupiah = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const localDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(value ? new Date(value) : new Date());
module.exports = { totals, perBranch, rupiah, localDate };
