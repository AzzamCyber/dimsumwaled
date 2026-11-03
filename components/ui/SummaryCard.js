"use client";
import { motion } from 'framer-motion';

export default function SummaryCard({ title, value, icon, colorClass, delay = 0 }) {
 return (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay }}
 className="glass rounded-2xl p-4 flex flex-col gap-2"
 >
 <div className="flex items-center justify-between">
 <span className="text-sm font-bold text-navy/70 ">{title}</span>
 <div className={`p-2 rounded-xl ${colorClass}`}>
 {icon}
 </div>
 </div>
 <div className="text-xl font-extrabold text-navy mt-1">
 {value}
 </div>
 </motion.div>
 );
}
