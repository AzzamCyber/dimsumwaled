"use client";
import { createContext,useContext,useEffect,useState } from 'react';
import { useSession,signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Fingerprint,Loader2,LogOut,ShieldCheck } from 'lucide-react';
import { getActiveShift,startShift,getStoreSettings } from '@/lib/actions';
import toast from 'react-hot-toast';
const AttendanceContext=createContext();
export const useAttendance=()=>useContext(AttendanceContext);
export default function AttendanceProvider({children}){
 const {data:session,status}=useSession(),pathname=usePathname();
 const [isShiftActive,setIsShiftActive]=useState(false),[shiftId,setShiftId]=useState(null),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[settings,setSettings]=useState(null),[error,setError]=useState(false);
 const isPublic=pathname.startsWith('/portal-karyawan')||pathname.startsWith('/katalog')||pathname.startsWith('/download');
 const admin=session?.user?.role==='super_admin';
 async function checkShift(){if(!session?.user?.id||admin||isPublic){setLoading(false);return;}setLoading(true);try{const [shift,config]=await Promise.all([getActiveShift(),getStoreSettings()]);setIsShiftActive(Boolean(shift));setShiftId(shift?.id||null);setSettings(config);setError(false);}catch{setError(true);}finally{setLoading(false);}}
 useEffect(()=>{if(status==='authenticated'&&!admin&&!isPublic)checkShift();else setLoading(false);},[status,session?.user?.id,admin,isPublic]);
 async function begin(){setStarting(true);try{const shift=await startShift();setIsShiftActive(true);setShiftId(shift.id);toast.success('Shift dimulai. Selamat bekerja!');}catch(e){toast.error(e.message);}finally{setStarting(false);}}
 const provider=content=><AttendanceContext.Provider value={{isShiftActive,shiftId,checkShift}}>{content}</AttendanceContext.Provider>;
 if(isPublic||admin||status==='unauthenticated')return provider(children);
 if(status==='loading'||loading)return <div className="loading-dashboard"><Loader2 size={22} className="animate-spin"/>Memeriksa sesi kerja…</div>;
 if(error)return <div className="error-card"><strong>Sesi kerja belum dapat dimuat.</strong><p>Coba masuk kembali untuk memperbarui akses akun.</p><button className="btn-secondary" onClick={()=>signOut({callbackUrl:'/portal-karyawan'})}>Masuk kembali</button></div>;
 if(!isShiftActive && pathname!=='/' && pathname!=='/settings')return <main className="cashier-shift-gate flex items-center justify-center p-6"><section className="panel" style={{padding:28,maxWidth:410,width:'100%',textAlign:'center'}}><img src="/logo.svg" alt="" width="58" height="58" style={{margin:'0 auto 23px'}}/><div className="eyebrow">SIAP MELAYANI HARI INI?</div><h1 style={{fontSize:24,fontWeight:600,margin:'12px 0'}}>Halo, {session?.user?.name}.</h1><p className="section-caption" style={{fontSize:12}}>Mulai shift untuk mencatat aktivitas kerja dan membuka kasir {settings?.branch_name||'cabang Anda'}.</p>{settings?.shift_rules&&<div style={{textAlign:'left',fontSize:11,lineHeight:1.9,whiteSpace:'pre-wrap',padding:18,background:'#f8f1e6',borderRadius:9,margin:'23px 0',color:'#9d7b55'}}>{settings.shift_rules}</div>}<button className="btn-primary" style={{width:'100%',marginTop:20,padding:15}} onClick={begin} disabled={starting}>{starting?<Loader2 size={17} className="animate-spin"/>:<Fingerprint size={17}/>}Mulai shift</button><button className="btn-secondary" style={{width:'100%',marginTop:12}} onClick={()=>signOut({callbackUrl:'/portal-karyawan'})}><LogOut size={14}/>Keluar akun</button><p className="section-caption" style={{marginTop:20,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><ShieldCheck size={12}/>Akses khusus cabang Anda</p></section></main>;
 return provider(children);
}
