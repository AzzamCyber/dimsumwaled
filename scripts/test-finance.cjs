const assert = require('node:assert/strict');
const { totals, perBranch, localDate } = require('../lib/finance.cjs');
const { resolveBranch, hashPassword, verifyPassword, validateCart } = require('../lib/security.cjs');
const data = {
 branches: [{id:'one',is_active:true},{id:'two',is_active:true},{id:'three',is_active:false}],
 transactions: [
  {branch_id:'one',status:'COMPLETED',total_amount:100000,transaction_items:[{base_price:20000,quantity:2}]},
  {branch_id:'two',status:'COMPLETED',total_amount:50000,transaction_items:[{base_price:20000,quantity:1}]},
  {branch_id:'one',status:'CANCELLED',total_amount:900000,transaction_items:[{base_price:100000,quantity:1}]},
 ],
 expenses: [{branch_id:'one',amount:10000},{branch_id:'two',amount:5000}],
 purchases: [{branch_id:'one',status:'COMPLETED',total_amount:50000},{branch_id:'two',status:'COMPLETED',total_amount:10000}],
};
assert.deepEqual(totals(data),{revenue:150000,cogs:60000,expenses:15000,purchases:60000,grossProfit:90000,netProfit:75000,cashFlow:75000,transactions:2});
const branches = perBranch(data);
assert.equal(branches[0].netProfit,50000); assert.equal(branches[0].cashFlow,40000);
assert.equal(branches[1].netProfit,25000); assert.equal(branches[2].revenue,0);
assert.equal(localDate('2026-11-02T18:00:00Z'),'2026-11-03');
assert.equal(resolveBranch({role:'super_admin',is_active:true},'all',data.branches,false),null);
assert.equal(resolveBranch({role:'karyawan',is_active:true,branch_id:'one'},'two',data.branches,false),'one');
assert.throws(()=>resolveBranch({role:'karyawan',is_active:true,branch_id:'three'},'one',data.branches));
const encoded = hashPassword('A local validation password');
assert(verifyPassword('A local validation password',encoded)); assert(!verifyPassword('wrong',encoded));
assert(!verifyPassword('wrong','scrypt$invalid$invalid'));
assert.deepEqual(validateCart([{id:'11111111-1111-4111-8111-111111111111',quantity:2,price:1,base_price:1}]),[{id:'11111111-1111-4111-8111-111111111111',quantity:2}]);
console.log('PASS: consolidated and per-branch profit, cash flow, cancelled sales, empty branches, WIB dates and access helpers');
