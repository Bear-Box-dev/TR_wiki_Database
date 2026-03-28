import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LayoutGrid, Package, LogIn, LogOut, User, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Send, Edit3, Clock, ChevronDown, Plus, Trash2, AlertTriangle, Type, Star, FileText, Layers, Link2, MapPin, Zap } from 'lucide-react';
import { fetchItems, fetchItemsByStatus, submitUpdate, approveUpdate, rejectUpdate, getPendingUpdate, fetchStatusCounts, revertToPending, GameItem, PendingUpdate, fetchDetailedStats, DetailedStats } from './data';
import { supabase } from './lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Toaster, toast } from 'sonner';
import { BarChart3, PieChart, TrendingUp, Users, Activity, CheckCircle, Clock as ClockIcon, FileWarning, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const getDirectImageUrl = (url: string | undefined) => {
  if (!url) return '';
  const trimmedUrl = url.trim();
  
  // Convert Google Drive links to direct download links
  if (trimmedUrl.includes('drive.google.com') || trimmedUrl.includes('docs.google.com/uc')) {
    let fileId = '';
    // Pattern 1: /d/ID/view or /d/ID
    const matchD = trimmedUrl.match(/\/d\/(.+?)([/?]|$)/);
    if (matchD) fileId = matchD[1];
    
    // Pattern 2: ?id=ID or &id=ID
    if (!fileId) {
      const matchId = trimmedUrl.match(/[?&]id=(.+?)(&|$)/);
      if (matchId) fileId = matchId[1];
    }
    
    if (fileId) {
      // Using a more reliable public endpoint for Drive images
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  return trimmedUrl;
};

const playSound = (type: 'success' | 'error' | 'click' | 'submit') => {
  const sounds = {
    success: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    submit: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.4;
  audio.play().catch(e => console.log('Audio play blocked:', e));
};

// --- Status Tabs ---
const STATUSES = [
  { id: 'no_data', label: 'ยังไม่มีข้อมูล', color: 'bg-gray-500', activeColor: 'bg-gray-600' },
  { id: 'checking', label: 'กำลังตรวจสอบ', color: 'bg-amber-500', activeColor: 'bg-amber-600' },
  { id: 'success', label: 'สำเร็จ', color: 'bg-emerald-500', activeColor: 'bg-emerald-600' },
] as const;

// --- Custom Select Component ---
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; color?: string }[];
  placeholder?: string;
  showSearch?: boolean;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const CustomSelect = ({ value, onChange, options, placeholder = "เลือก...", showSearch = false, className = "", icon, disabled = false }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className} ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full bg-slate-950 border rounded-2xl py-4 px-6 text-sm flex items-center justify-between transition-all text-white ${
          isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-800 hover:border-slate-700'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`flex items-center gap-2 ${value ? '' : 'text-gray-500'}`}>
          {selectedOption?.color && (
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: selectedOption.color }} 
            />
          )}
          {icon && <span className="text-gray-400">{icon}</span>}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[120] left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {showSearch && (
              <div className="p-3 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="ค้นหา..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="p-2 max-h-60 overflow-y-auto scrollbar-thin">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      value === option.value 
                        ? 'bg-indigo-500/10 text-white' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {option.color && (
                      <div 
                        className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
                        style={{ 
                          backgroundColor: option.color,
                          boxShadow: `0 0 12px ${option.color}40`
                        }} 
                      />
                    )}
                    {option.label}
                    {value === option.value && (
                      <div className="ml-auto">
                        <CheckCircle2 size={14} className="text-indigo-400" />
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-gray-500 font-bold italic">
                  ไม่พบข้อมูล
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 30;

  // Categories
  const CATEGORIES = [
    { id: 'acc_back', label: 'Back (หลัง)' },
    { id: 'acc_head', label: 'Head (หัว)' },
    { id: 'acc_neck', label: 'Neck (คอ)' },
    { id: 'acc_hand', label: 'Hand (มือ)' },
    { id: 'acc_foot', label: 'Foot (เท้า)' },
    { id: 'acc_face', label: 'Face (หน้า)' },
    { id: 'acc_waist', label: 'Waist (เอว)' },
    { id: 'costumes', label: 'Costumes (ชุด)' },
    { id: 'pets', label: 'Pets (สัตว์เลี้ยง)' },
  ];
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  // Tabs State
  const [activeTab, setActiveTab] = useState<number | 'all'>('all'); // 0: No Data, 1: Checking, 2: Success, 'all': All
  const [statusCounts, setStatusCounts] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0 });
  const [view, setView] = useState<'list' | 'dashboard'>('list');
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Form State for Status 0
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRank, setNewRank] = useState('');
  const [newTypeWear, setNewTypeWear] = useState('');
  const [newRelateItems, setNewRelateItems] = useState<string[]>([]);
  const [relateItemInput, setRelateItemInput] = useState('');
  const [newWhereToFindItems, setNewWhereToFindItems] = useState<string[]>([]);
  const [whereToFindInput, setWhereToFindInput] = useState('');
  const [dynamicStats, setDynamicStats] = useState<{ key: string, value: string | number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const RANK_OPTIONS = [
  { value: 'B', label: 'ระดับ B', color: '#94a3b8' },
  { value: 'A', label: 'ระดับ A', color: '#3b82f6' },
  { value: 'S', label: 'ระดับ S', color: '#a855f7' },
  { value: 'SS', label: 'ระดับ SS', color: '#ec4899' },
  { value: 'SS+', label: 'ระดับ SS+', color: '#f43f5e' },
  { value: 'SSS', label: 'ระดับ SSS', color: '#f59e0b' },
];

const ITEM_STATS_LIST = [
  { key: 'speed', label: 'ความเร็ว' },
  { key: 'acceleration', label: 'อัตราเร่ง' },
  { key: 'power', label: 'แรง' },
  { key: 'control', label: 'ควบคุม' },
  { key: 'luck', label: 'โชค' },
  { key: 'max_speed', label: 'ความเร็วสูงสุด' },
  { key: 'max_acc', label: 'อัตราเร่งสูงสุด' },
  { key: 'max_control', label: 'ควบคุมสูงสุด' },
  { key: 'exp_bonus_flat', label: 'โบนัส EXP' },
  { key: 'exp_bonus_percent', label: 'โบนัส EXP (%)' },
  { key: 'exp_max_per_map', label: 'เพิ่ม EXP สูงสุด ต่อสนาม' },
  { key: 'exp_chance_double__pct', label: 'โอกาสได้รับ EXP 2 เท่า (%)' },
  { key: 'exp_any_result_bonus_flat', label: 'โบนัส EXP โดยไม่คำนึงถึงผลแพ้ชนะ' },
  { key: 'exp_solo_rank_1_3_pct', label: 'โบนัส EXP เมื่อเข้าเส้นชัยประเภทเดี่ยว 1-3 (%)' },
  { key: 'exp_team_relay_win_pct', label: 'เมื่อชนะการแข่งขันทีม, วิ่งผลัด โบนัส EXP(%)' },
  { key: 'exp_anubis_raid_flat', label: 'โบนัส EXP ใน อนูบิสหรือเรด' },
  { key: 'exp_unity_s_rank_pct', label: 'เมื่อผ่านสนาม UNITY เกรด S จะได้รับ EXP(%)' },
  { key: 'exp_pet_pct', label: 'เพิ่ม EXP สัตว์เลี้ยง (%)' },
  { key: 'exp_couple_bonus_pct', label: 'เมื่อวิ่งกับคู่รักจะได้รับโบนัส Exp (%)' },
  { key: 'jack_pot_chance_pct', label: 'รางวัลแจ็กพอต' },
  { key: 'exp_solo_win_8p_pct', label: 'เมื่อชนะทุกคนในประเภทวิ่งเดี่ยว 8 คน ขึ้นไปได้รับ EXP (%)' },
  { key: 'Magnet', label: 'ดึงดูดแม่เหล็ก' },
  { key: 'tr_bonus_flat', label: 'โบนัส TR' },
  { key: 'tr_bonus_pct', label: 'โบนัส TR(%)' },
  { key: 'tr_any_result_bonus_flat', label: 'โบนัส TR โดยไม่คำนึงถึงผลแพ้ชนะ' },
  { key: 'tr_solo_rank_1_3_pct', label: 'โบนัส TR เมื่อเข้าเส้นชัยประเภทเดี่ยว 1-3 (%)' },
  { key: 'tr_team_relay_win_pct', label: 'เมื่อชนะการแข่งขันทีม, วิ่งผลัด โบนัส TR(%)' },
  { key: 'tr_couple_bonus_pct', label: 'เมื่อวิ่งกับคู่รักจะได้รับโบนัส TR (%)' },
  { key: 'tr_unity_s_rank_pct', label: 'เมื่อผ่านสนาม UNITY เกรด S จะได้รับ TR(%)' },
  { key: 'tr_solo_win_8p_pct', label: 'เมื่อชนะทุกคนในประเภทวิ่งเดี่ยว 8 คน ขึ้นไป TR (%)' },
  { key: 'fury_gain_pct', label: 'ความเร็วในการสะสมโกรธ (%)' },
  { key: 'fury_duration_pct', label: 'ระยะเวลาโกรธ (%)' },
  { key: 'fury_trans_duration_pct', label: 'ลดระยะเวลาในการแปลงร่างโกรธ' },
  { key: 'burnout_gain_fury_pct', label: 'เมื่อหมดแรงจะฟิ้นฟูเกจความโกรธ (%)' },
  { key: 'attack_damage_flat', label: 'พลังโจมตี' },
  { key: 'critical_damage_flat', label: 'คริติคอล' },
  { key: 'protection_flat', label: 'พลังป้องกัน' },
  { key: 'health_flat', label: 'พลังชีวิต' },
  { key: 'attack_gain_fury_pct', label: 'เพิ่มพลังโจมตีเมื่อโกรธ' },
  { key: 'attack_bonus_critical_flat', label: 'พลังทำลายเพิ่มเติมเมื่อ คริติคอล' },
  { key: 'Critical_Chance_1_5_pct', label: 'โอกาสได้รับการโจมตีคริตคอล 1.5 เท่า (%)' },
  { key: 'damage_bonus_demon_boss_pct', label: 'ความเสียหายเพิ่มเติมต่อบอสประเภทปีศาจ (%)' },
  { key: 'damage_bonus_robot_boss_pct', label: 'ความเสียหายเพิ่มเติมต่อบอสประเภทเครื่องจักร (%)' },
  { key: 'damage_bonus_human_boss_pct', label: 'ความเสียหายเพิ่มเติมต่อบอสประเภทมนุษย์ (%)' },
  { key: 'damage_bonus_animal_boss_pct', label: 'ความเสียหายเพิ่มเติมต่อบอสประเภทสัตว์(%)' },
  { key: 'damage_bonus_all_boss_pct', label: 'ความเสียหายเพิ่มเติมต่อบอสทุกประเภท (%)' },
  { key: 'dash_speed_pct', label: 'เพิ่มความเร็วแดช (%)' },
  { key: 'dash_acceleration_pct', label: 'เพิ่มแรงพุ่งตัว (%)' },
  { key: 'max_dash_gauge_pct', label: 'เพิ่มเกจแดชสูงสุด (%)' },
  { key: 'land_dash_duration_sec', label: 'เพิ่มระยะเวลาเมื่อ landing แดช (วินาที)' },
  { key: 'land_dash_decision_sec', label: 'เพิ่มระยะเวลาในการตัดสิน Land แดช (วินาที)' },
  { key: 'obtacle_dash_chance_pct', label: 'โอกาสแดชเมื่อชนสิ่งกีดขวาง (%)' },
  { key: 'dodge_obstacle_1_chance_pct', label: 'อัตราหลบหลีก 1 ครั้งเมื่อชนสิ่งกีดขวาง (%)' },
  { key: 'dodge_obstacle_chance_pct', label: 'อัตราการหลบหลีกเมื่อชนสิ่งกีดขวาง (%)' },
  { key: 'obstacle_recovery_time_pct', label: 'โอกาสในการ แดช เมื่อ คืนชีพ (%)' },
  { key: 'revive_dash_chance_pct', label: 'ลดระยะเวลาในการลุกขึ้นเมื่อชนสิ่งกีดขวาง (%)' },
  { key: 'dash_chance_stumble_pct', label: 'อัตราการแดชเมื่อถูกเหยียบหัว (%)' },
  { key: 'dash_plat_duration_pct', label: 'เพิ่มระยะเวลาแดชเมื่อเหยียบแท่นแดช (%)' },
  { key: 'doge_fury_pct', label: 'หลบหลีกจากการโจมตีโกรธ (%)' },
  { key: 'revive_speed_duration_pct', label: 'ลดระยะเวลาในการเกิดใหม่ (%)' },
  { key: 'Burnout_duration_pct', label: 'ลดระยะเวลาหมดแรง (%)' },
  { key: 'b_melon_reduction_pct', label: 'ลดเวลาเมล่อนดำปี๋ (%)' },
  { key: 'r_melon_reduction_pct', label: 'ลดเวลาเมล่อนแดงแจ๋ (%)' },
  { key: 'tray_stun_reduction_pct', label: 'ลดเวลาถาดจังนะ (%)' },
  { key: 'bucket_stun_reduction_pct', label: 'หลุดจากถังหรรษาเร็วขึ้น (%)' },
  { key: 'pc_block_chance_pct', label: 'อัตราการป้องกันไก่/แพนกวิน (%)' },
  { key: 'lizard_trans_chance_pct', label: 'อัตราแปลงร่างเป็นกิ้งก่า (%)' },
  { key: 'shock_resist_pct', label: 'ต้านทานไฟฟ้า (%)' },
  { key: 'stomp_resist_pct', label: 'ต้านทานการถูกเหยียบหัว (%)' },
  { key: 'stomp_reflect_pct', label: 'โอกาสหัวเด้ง (%)' },
  { key: 'guardian_wind_duration_pct', label: 'เพิ่มระยะเวลาสายลมผู้พิทักษ์ลดเวลาเมล่อนแดงแจ๋ (%)' },
  { key: 'speed_potion_duration_pct', label: 'เพิ่มระยะเวลาน้ำนาวิ่งไว (%)' },
  { key: 'swim_speed_flat', label: 'ว่ายน้ำไว' },
  { key: 'stomp_dash_pct', label: 'อัตราการได้แดชเมื่อถูกเหยียบหัว (%)' },
  { key: 'red_shoes_duration_pct', label: 'เพิ่มระยะเวลารองเท้าแดง (%)' },
  { key: 'exp_bonus_per_level_pct', label: 'โบนัส EXP ต่อเลเวลผู้เล่น (%)' },
  { key: 'tr_bonus_per_level_pct', label: 'โบนัส TR ต่อเลเวลผู้เล่น (%)' },
  { key: 'voodoo_duration_pct', label: 'ลดระยะเวลาหิน voodoo ลง (%)' },
];

  // Admin Review State for Status 1
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);

  // Admin Edit State
  const [adminEditName, setAdminEditName] = useState('');
  const [adminEditDesc, setAdminEditDesc] = useState('');
  const [adminEditRank, setAdminEditRank] = useState('');
  const [adminEditTypeWear, setAdminEditTypeWear] = useState('');
  const [adminEditRelateItems, setAdminEditRelateItems] = useState<string[]>([]);
  const [adminEditRelateInput, setAdminEditRelateInput] = useState('');
  const [adminEditWhereToFindItems, setAdminEditWhereToFindItems] = useState<string[]>([]);
  const [adminEditWhereToFindInput, setAdminEditWhereToFindInput] = useState('');
  const [adminEditStats, setAdminEditStats] = useState<{ key: string, value: string | number }[]>([]);

  // Auth State
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    try {
      const [{ data, count }, counts] = await Promise.all([
        fetchItemsByStatus(activeCategory, activeTab, currentPage, itemsPerPage),
        fetchStatusCounts(activeCategory)
      ]);
      
      const pendingItems = data.filter(item => item.verification_status === 1);
      if (pendingItems.length > 0) {
        const itemNames = pendingItems.map(item => item.name);
        const { data: pendingUpdates } = await supabase
          .from('pending_updates')
          .select('name, item_name')
          .eq('table_name', activeCategory)
          .in('name', itemNames);
          
        if (pendingUpdates) {
          const updatedData = data.map(item => {
            if (item.verification_status === 1) {
              const update = pendingUpdates.find(u => u.name === item.name);
              if (update && update.item_name) {
                return { ...item, name: update.item_name, originalName: item.name };
              }
            }
            return item;
          });
          setItems(updatedData);
        } else {
          setItems(data);
        }
      } else {
        setItems(data);
      }
      
      setTotalItems(count);
      setStatusCounts(counts);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const stats = await fetchDetailedStats(activeCategory);
      setDetailedStats(stats);
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      fetchStats();
    }
  }, [view, activeCategory]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      playSound('click');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      playSound('success');
      toast.success('เข้าสู่ระบบสำเร็จ', {
        description: 'ยินดีต้อนรับแอดมิน!',
        className: 'glass-container !bg-slate-900 !border-emerald-500/50 !text-white',
      });
      
      setShowLoginModal(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setLoginError(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      playSound('error');
      toast.error('เข้าสู่ระบบไม่สำเร็จ', {
        description: error.message || 'โปรดตรวจสอบอีเมลและรหัสผ่านของคุณ',
        className: 'glass-container !bg-slate-900 !border-red-500/50 !text-white',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info('ออกจากระบบแล้ว', {
      description: 'ขอบคุณที่ปฏิบัติหน้าที่แอดมิน!',
      className: 'glass-container !bg-slate-900 !border-indigo-500/50 !text-white',
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    };

    loadData();
  }, [activeCategory, activeTab, currentPage]);

  // Fetch pending update details when an item in status 1 is selected
  useEffect(() => {
    if (selectedItem && selectedItem.verification_status === 1) {
      const nameToFetch = (selectedItem as any).originalName || selectedItem.name;
      getPendingUpdate(nameToFetch, activeCategory).then(update => {
        setPendingUpdate(update);
        if (update) {
          // item_name is the proposed new name in our new schema
          setAdminEditName(update.item_name || update.name || '');
          setAdminEditDesc(update.description || '');
          setAdminEditRank(update.rank || '');
          setAdminEditTypeWear(update.type_wear || '');
          setAdminEditRelateItems(update.relate_item ? update.relate_item.split(', ').filter(Boolean) : []);
          setAdminEditWhereToFindItems(update.where_to_find_item ? update.where_to_find_item.split(', ').filter(Boolean) : []);
          
          if (update.properties) {
            const stats = Object.entries(update.properties).map(([key, value]) => ({
              key,
              value: value as string | number
            }));
            setAdminEditStats(stats);
          } else {
            setAdminEditStats([]);
          }
        }
      });
    } else {
      setPendingUpdate(null);
    }
  }, [selectedItem, activeTab, activeCategory]);

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!newRank) {
      playSound('error');
      toast.error('กรุณาเลือกระดับความแรร์', {
        description: 'โปรดเลือกความแรร์ของไอเทมก่อนส่งข้อมูล',
        icon: <AlertTriangle className="text-amber-500" size={18} />,
        className: 'glass-container !bg-slate-900 !border-amber-500/50 !text-white',
      });
      return;
    }

    if (!newTypeWear) {
      playSound('error');
      toast.error('กรุณาเลือกประเภทสวมใส่', {
        description: 'โปรดเลือกประเภทการสวมใส่ของไอเทมก่อนส่งข้อมูล',
        icon: <AlertTriangle className="text-amber-500" size={18} />,
        className: 'glass-container !bg-slate-900 !border-amber-500/50 !text-white',
      });
      return;
    }

    setIsSubmitting(true);
    playSound('click');
    try {
      // Convert dynamic stats to JSON object
      const properties = dynamicStats.reduce((acc, stat) => {
        if (stat.key && stat.value !== '') {
          acc[stat.key] = typeof stat.value === 'string' ? parseFloat(stat.value) : stat.value;
        }
        return acc;
      }, {} as Record<string, number>);

      await submitUpdate(
        activeCategory,
        selectedItem.id || '', // originalId
        selectedItem.name, // originalName
        newName, // newName
        newDesc, 
        newRank,
        newTypeWear,
        newRelateItems.join(', '),
        newWhereToFindItems.join(', '),
        properties
      );
      
      playSound('success');
      toast.success('ส่งข้อมูลสำเร็จ', {
        description: 'ข้อมูลของคุณถูกส่งไปรอการตรวจสอบแล้ว ขอบคุณที่ช่วยพัฒนาฐานข้อมูล!',
        className: 'glass-container !bg-slate-900 !border-emerald-500/50 !text-white',
      });
      
      setSelectedItem(null);
      setShowSubmitModal(false);
      setNewName('');
      setNewDesc('');
      setNewRank('');
      setNewTypeWear('');
      setNewRelateItems([]);
      setRelateItemInput('');
      setNewWhereToFindItems([]);
      setWhereToFindInput('');
      setDynamicStats([]);
      
      // Refresh current tab
      const { data, count } = await fetchItemsByStatus(activeCategory, activeTab, currentPage, itemsPerPage);
      setItems(data);
      setTotalItems(count);
      const counts = await fetchStatusCounts(activeCategory);
      setStatusCounts(counts);
    } catch (error) {
      console.error('Error submitting update:', error);
      playSound('error');
      toast.error('เกิดข้อผิดพลาดในการส่งข้อมูล', {
        description: 'ไม่สามารถส่งข้อมูลได้ในขณะนี้ โปรดลองใหม่อีกครั้ง',
        className: 'glass-container !bg-slate-900 !border-red-500/50 !text-white',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem || !pendingUpdate) return;
    setIsAdminActionLoading(true);
    try {
      // Convert dynamic stats to JSON object
      const properties = adminEditStats.reduce((acc, stat) => {
        if (stat.key && stat.value !== '') {
          acc[stat.key] = typeof stat.value === 'string' ? parseFloat(stat.value) : stat.value;
        }
        return acc;
      }, {} as Record<string, number>);

      const updatedPendingData: PendingUpdate = {
        ...pendingUpdate,
        item_name: adminEditName, // item_name is the new name
        description: adminEditDesc,
        rank: adminEditRank,
        type_wear: adminEditTypeWear,
        relate_item: adminEditRelateItems.join(', '),
        where_to_find_item: adminEditWhereToFindItems.join(', '),
        properties: properties
      };

      const nameToUpdate = pendingUpdate.name || selectedItem.name;
      await approveUpdate(nameToUpdate, updatedPendingData);
      playSound('success');
      toast.success('อนุมัติข้อมูลสำเร็จ', {
        description: `อัปเดตข้อมูลของ ${selectedItem.name} เรียบร้อยแล้ว`,
        className: 'glass-container !bg-slate-900 !border-emerald-500/50 !text-white',
      });
      setSelectedItem(null);
      // Refresh
      await refreshData();
    } catch (error) {
      console.error('Error approving update:', error);
      playSound('error');
      toast.error('เกิดข้อผิดพลาดในการอนุมัติ', {
        description: 'ไม่สามารถอนุมัติข้อมูลได้ในขณะนี้ โปรดลองใหม่อีกครั้ง',
        className: 'glass-container !bg-slate-900 !border-red-500/50 !text-white',
      });
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !pendingUpdate) return;
    setIsAdminActionLoading(true);
    try {
      const nameToUpdate = pendingUpdate.name || selectedItem.name;
      await rejectUpdate(nameToUpdate, pendingUpdate);
      playSound('click');
      toast.success('ปฏิเสธข้อมูลสำเร็จ', {
        description: `ยกเลิกการแก้ไขข้อมูลของ ${selectedItem.name} แล้ว`,
        className: 'glass-container !bg-slate-900 !border-amber-500/50 !text-white',
      });
      setSelectedItem(null);
      await refreshData();
    } catch (error) {
      console.error('Error rejecting update:', error);
      playSound('error');
      toast.error('เกิดข้อผิดพลาดในการปฏิเสธ', {
        description: 'ไม่สามารถปฏิเสธข้อมูลได้ในขณะนี้ โปรดลองใหม่อีกครั้ง',
        className: 'glass-container !bg-slate-900 !border-red-500/50 !text-white',
      });
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const addStatRow = () => {
    setDynamicStats([...dynamicStats, { key: '', value: '' }]);
  };

  const removeStatRow = (index: number) => {
    const newStats = [...dynamicStats];
    newStats.splice(index, 1);
    setDynamicStats(newStats);
  };

  const updateStatRow = (index: number, field: 'key' | 'value', val: string | number) => {
    const newStats = [...dynamicStats];
    if (field === 'key') {
      newStats[index].key = val as string;
    } else {
      newStats[index].value = val;
    }
    setDynamicStats(newStats);
  };

  const addAdminStatRow = () => {
    setAdminEditStats([...adminEditStats, { key: '', value: '' }]);
  };

  const removeAdminStatRow = (index: number) => {
    const newStats = [...adminEditStats];
    newStats.splice(index, 1);
    setAdminEditStats(newStats);
  };

  const updateAdminStatRow = (index: number, field: 'key' | 'value', val: string | number) => {
    const newStats = [...adminEditStats];
    if (field === 'key') {
      newStats[index].key = val as string;
    } else {
      newStats[index].value = val;
    }
    setAdminEditStats(newStats);
  };

  const handleAdminRelateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const val = adminEditRelateInput.trim().replace(/,$/, '');
      if (val && !adminEditRelateItems.includes(val)) {
        setAdminEditRelateItems([...adminEditRelateItems, val]);
        setAdminEditRelateInput('');
      }
    }
  };

  const handleAdminWhereKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const val = adminEditWhereToFindInput.trim().replace(/,$/, '');
      if (val && !adminEditWhereToFindItems.includes(val)) {
        setAdminEditWhereToFindItems([...adminEditWhereToFindItems, val]);
        setAdminEditWhereToFindInput('');
      }
    }
  };

  // Force dark mode on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedItem]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // window.scrollTo({ top: 0, behavior: 'smooth' }); // Removed auto-scroll
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300`}>
      <Toaster position="top-center" expand={false} richColors closeButton />
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1e1b4b] to-[#4338ca] dark:from-[#0f172a] dark:to-[#1e293b] text-white p-5 shadow-xl sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transform group-hover:rotate-12 transition-transform">
                  TR
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none">TalesRunner Wiki</h1>
                <p className="text-[10px] opacity-60 font-bold uppercase tracking-[0.2em] mt-1">Item Archive</p>
              </div>
            </div>

            <nav className="flex items-center gap-4 ml-4">
              <button
                onClick={() => {
                  playSound('click');
                  setView('list');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  view === 'list' 
                    ? 'bg-white text-indigo-900 shadow-lg' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Package size={14} />
                Database
              </button>

              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playSound('click');
                      setView('dashboard');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      view === 'dashboard'
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    Admin Dashboard
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      handleLogout();
                    }}
                    title="Logout"
                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    playSound('click');
                    setShowLoginModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 bg-white/10 text-white border border-white/20 hover:bg-white/20"
                >
                  <LogIn size={14} />
                  Admin Login
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-72 p-6 flex flex-col gap-6">
          {/* Category Selector */}
          <div className="game-card p-5 flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 px-2">หมวดหมู่ (Category)</h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playSound('click');
                    setActiveCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-black transition-all border ${
                    activeCategory === cat.id
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-lg'
                      : 'bg-slate-900/50 text-gray-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${activeCategory === cat.id ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                    {cat.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="game-card p-5 flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-[0.2em] mb-4 px-2">จัดการข้อมูล</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'all', label: 'ทั้งหมด', icon: <LayoutGrid size={14} />, color: 'text-indigo-400', activeBg: 'bg-indigo-500/20', count: (Object.values(statusCounts) as number[]).reduce((a, b) => a + b, 0) },
                { id: 0, label: 'ยังไม่มีข้อมูล', icon: <XCircle size={14} />, color: 'text-gray-400', activeBg: 'bg-gray-500/20', count: statusCounts[0] },
                { id: 1, label: 'รอตรวจสอบ', icon: <Clock size={14} />, color: 'text-amber-400', activeBg: 'bg-amber-500/20', count: statusCounts[1] },
                { id: 2, label: 'สำเร็จ', icon: <CheckCircle2 size={14} />, color: 'text-emerald-400', activeBg: 'bg-emerald-500/20', count: statusCounts[2] },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    playSound('click');
                    setActiveTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition-all border ${
                    activeTab === tab.id
                      ? `${tab.activeBg} ${tab.color} border-current shadow-lg`
                      : 'bg-slate-900/50 text-gray-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {tab.icon}
                    {tab.label}
                  </div>
                  <span className="text-[10px] opacity-60 bg-black/20 px-2 py-0.5 rounded-lg">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 flex flex-col gap-8">
          {view === 'list' ? (
            <>
              <div className="flex flex-col items-center lg:flex-row lg:justify-between gap-8 mb-4">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <span className="w-2.5 h-10 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/20"></span>
                  รายการไอเทม
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 ml-3 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{totalItems} ไอเทม</span>
                </h2>

                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-5 w-full lg:w-auto">
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="glass-container aspect-square animate-pulse flex flex-col p-4 gap-4">
                      <div className="flex-1 bg-white/5 rounded-2xl" />
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.div
                          key={item.name}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          whileHover={{ y: -8, scale: 1.02 }}
                          onClick={() => {
                            setSelectedItem(item);
                            if (item.verification_status === 0) {
                              setNewName(item.name);
                              setNewDesc(item.description || '');
                              setNewRank(item.rank || '');
                            }
                          }}
                          className={`game-card rarity-${item.rank?.replace('+', '\\+')} cursor-pointer group flex flex-col border-2 ${
                            item.verification_status === 0 ? 'border-gray-500/30' : 
                            item.verification_status === 1 ? 'border-amber-500/50' : 
                            'border-emerald-500/50'
                          }`}
                        >
                          <div className="aspect-square relative flex items-center justify-center p-4 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-full h-full relative flex items-center justify-center">
                              <img
                                src={getDirectImageUrl(item.url)}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(item.name)}/200/200`;
                                }}
                              />
                            </div>
                            <div className={`absolute top-3 right-3 rarity-badge rarity-badge-${item.rank?.replace('+', '\\+')} shadow-lg transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap`}>
                              {item.rank}
                            </div>
                            <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider text-white shadow-lg z-10 transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ${
                              item.verification_status === 0 ? 'bg-gray-500' : item.verification_status === 1 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}>
                              {item.verification_status === 0 ? 'ยังไม่มีข้อมูล' : item.verification_status === 1 ? 'รอตรวจสอบ' : 'สำเร็จ'}
                            </div>
                          </div>
                          <div className="p-4 border-t border-gray-50 dark:border-gray-700/50">
                            <h3 className="text-xs md:text-sm font-bold line-clamp-2 min-h-[3rem] leading-tight [word-break:normal] [overflow-wrap:anywhere] [line-break:strict] group-hover:text-indigo-400 transition-colors">
                              {item.name}
                            </h3>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider whitespace-nowrap ${
                                item.type_wear?.toLowerCase().includes('exp') ? 'bg-green-900/30 text-green-400' :
                                item.type_wear?.toLowerCase().includes('tr') ? 'bg-blue-900/30 text-blue-400' :
                                item.type_wear?.toLowerCase().includes('โกรธ') ? 'bg-red-900/30 text-red-400' :
                                'bg-indigo-900/30 text-indigo-400'
                              }`}>
                                {item.type_wear}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {totalItems === 0 && (
                    <div className="text-center py-24 bg-slate-900/50 rounded-[3rem] border-4 border-dashed border-slate-800 flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-slate-600">
                        <Search size={40} />
                      </div>
                      <p className="text-gray-400 font-bold">ไม่พบไอเทมในหมวดหมู่นี้</p>
                    </div>
                  )}

                  {/* Pagination */}
                  {Math.ceil(totalItems / itemsPerPage) > 1 && (
                    <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 mt-12 mb-16">
                      {/* First Page */}
                      <button
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(1)}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all shadow-sm border bg-gray-800 border-gray-700 hover:bg-purple-600"
                        title="First Page"
                      >
                        <ChevronsLeft size={20} />
                      </button>

                      <button
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all shadow-sm border bg-gray-800 border-gray-700 hover:bg-purple-600"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <div className="flex gap-1 md:gap-2">
                        {(() => {
                          const pages = [];
                          const totalPages = Math.ceil(totalItems / itemsPerPage);
                          const maxVisible = 5;
                          let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                          let end = Math.min(totalPages, start + maxVisible - 1);

                          if (end - start + 1 < maxVisible) {
                            start = Math.max(1, end - maxVisible + 1);
                          }

                          for (let i = start; i <= end; i++) {
                            const isCurrent = currentPage === i;
                            pages.push(
                              <button
                                key={i}
                                onClick={() => handlePageChange(i)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl font-black text-xs md:text-sm transition-all ${
                                  isCurrent
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-110 z-10'
                                    : 'bg-transparent text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700 hover:border-indigo-400 hover:text-indigo-500'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pages;
                        })()}
                      </div>

                      <button
                        disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all shadow-sm border bg-gray-800 border-gray-700 hover:bg-purple-600"
                      >
                        <ChevronRight size={20} />
                      </button>

                      {/* Last Page */}
                      <button
                        disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                        onClick={() => handlePageChange(Math.ceil(totalItems / itemsPerPage))}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all shadow-sm border bg-gray-800 border-gray-700 hover:bg-purple-600"
                        title="Last Page"
                      >
                        <ChevronsRight size={20} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white flex items-center gap-3">
                    <BarChart3 className="text-indigo-500" size={32} />
                    สถิติระบบ (System Statistics)
                  </h2>
                  <p className="text-gray-400 font-bold mt-1">ภาพรวมการจัดการข้อมูลในระบบ</p>
                </div>
                <button 
                  onClick={fetchStats}
                  disabled={isStatsLoading}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <RefreshCw size={18} className={isStatsLoading ? 'animate-spin' : ''} />
                  <span className="text-xs font-black uppercase tracking-wider">รีเฟรชสถิติ</span>
                </button>
              </div>

              {isStatsLoading && !detailedStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-container h-32 animate-pulse bg-white/5" />
                  ))}
                </div>
              ) : detailedStats && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-container p-6 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Activity size={100} />
                      </div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">ไอเทมทั้งหมด</p>
                      <h3 className="text-4xl font-black text-white">{detailedStats.total}</h3>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-indigo-300/60">
                        <TrendingUp size={12} />
                        <span>ข้อมูลในตาราง {activeCategory}</span>
                      </div>
                    </div>

                    <div className="glass-container p-6 border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <ClockIcon size={100} />
                      </div>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">รอการตรวจสอบ</p>
                      <h3 className="text-4xl font-black text-white">{detailedStats.status1}</h3>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-300/60">
                        <Activity size={12} />
                        <span>{detailedStats.pendingUpdates} คำขอแก้ไขทั้งหมด</span>
                      </div>
                    </div>

                    <div className="glass-container p-6 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <CheckCircle size={100} />
                      </div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">สำเร็จแล้ว</p>
                      <h3 className="text-4xl font-black text-white">{detailedStats.status2}</h3>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-300/60">
                        <ArrowUpRight size={12} />
                        <span>{((detailedStats.status2 / detailedStats.total) * 100).toFixed(1)}% ของทั้งหมด</span>
                      </div>
                    </div>

                    <div className="glass-container p-6 border-gray-500/20 bg-gray-500/5 relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <FileWarning size={100} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ยังไม่มีข้อมูล</p>
                      <h3 className="text-4xl font-black text-white">{detailedStats.status0}</h3>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-300/60">
                        <ArrowDownRight size={12} />
                        <span>เหลืออีก {detailedStats.status0} รายการ</span>
                      </div>
                    </div>
                  </div>

                  {/* Today's Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-container p-8 border-white/5 bg-slate-900/40">
                      <h4 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="text-indigo-500" size={20} />
                        กิจกรรมวันนี้ (Today's Activity)
                      </h4>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                              <ClockIcon size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-white">คำขอแก้ไขใหม่วันนี้</p>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">New Pending Updates</p>
                            </div>
                          </div>
                          <div className="text-2xl font-black text-amber-500">+{detailedStats.todayPending}</div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                              <CheckCircle size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-white">อนุมัติสำเร็จวันนี้</p>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Approved Today</p>
                            </div>
                          </div>
                          <div className="text-2xl font-black text-emerald-500">+{detailedStats.todayApproved}</div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-container p-8 border-white/5 bg-slate-900/40 flex flex-col justify-center items-center text-center">
                      <div className="w-24 h-24 rounded-full border-8 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center mb-6">
                        <span className="text-2xl font-black text-white">{((detailedStats.status2 / detailedStats.total) * 100).toFixed(0)}%</span>
                      </div>
                      <h4 className="text-xl font-black text-white mb-2">ความคืบหน้าโดยรวม</h4>
                      <p className="text-gray-400 text-sm font-bold max-w-xs">
                        ระบบมีข้อมูลที่สมบูรณ์แล้ว {detailedStats.status2} จากทั้งหมด {detailedStats.total} รายการ
                      </p>
                      <div className="w-full bg-white/5 h-2 rounded-full mt-8 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
                          style={{ width: `${(detailedStats.status2 / detailedStats.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t p-10 mt-auto transition-colors bg-gray-800 border-gray-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center text-white font-black">TR</div>
            <div>
              <p className="font-black text-gray-100">TalesRunner Wiki Database</p>
              <p className="text-xs text-gray-400">ระบบจัดการฐานข้อมูล TalesRunner Wiki (Supabase)</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm font-bold text-gray-400">
          </div>
        </div>
      </footer>

      {/* Item Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="game-card w-full max-w-5xl overflow-hidden relative z-10 flex flex-col md:flex-row max-h-[90vh] border-none shadow-2xl"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all z-20"
              >
                <X size={24} />
              </button>

              <div className="w-full md:w-[30%] bg-slate-950 flex items-center justify-center relative p-8 md:p-12 border-r border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))]" />
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-6">
                  <img
                    src={getDirectImageUrl(selectedItem.url)}
                    alt={selectedItem.name}
                    className="w-full h-auto max-h-[380px] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(selectedItem.name)}/600/600`;
                    }}
                  />
                </div>
              </div>

              <div className="w-full md:w-[70%] p-10 md:p-14 flex flex-col gap-10 overflow-y-auto relative">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Status 2: Success View */}
                {selectedItem.verification_status === 2 && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-black text-white">{selectedItem.name}</h3>
                            <span className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                              ID: {selectedItem.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`rarity-badge rarity-badge-${selectedItem.rank?.replace('+', '\\+')}`}>
                              {selectedItem.rank}
                            </span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                              ตรวจสอบสำเร็จแล้ว
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={12} /> คำอธิบาย
                          </label>
                          <p className="text-sm text-gray-300 leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                            {selectedItem.description || 'ไม่มีคำอธิบาย'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={12} /> ประเภทสวมใส่
                          </label>
                          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                            <span className="text-sm font-bold text-indigo-400 uppercase">{selectedItem.type_wear || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={12} /> คุณสมบัติ (Stats)
                          </label>
                          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 min-h-[100px]">
                            {selectedItem.properties && Object.keys(selectedItem.properties).length > 0 ? (
                              <div className="grid grid-cols-1 gap-2">
                                {Object.entries(selectedItem.properties).map(([key, value]) => {
                                  const statInfo = ITEM_STATS_LIST.find(s => s.key === key);
                                  return (
                                    <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                      <span className="text-gray-400 font-bold">{statInfo?.label || key}</span>
                                      <span className="text-indigo-400 font-black">+{String(value)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic text-center py-4">ไม่มีข้อมูลคุณสมบัติ</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Link2 size={12} /> ไอเทมที่เกี่ยวข้อง
                          </label>
                          <div className="flex flex-wrap gap-2 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                            {selectedItem.relate_item ? selectedItem.relate_item.split(', ').map((tag, i) => (
                              <span key={i} className="px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded-lg text-[10px] font-black border border-indigo-500/20">
                                {tag}
                              </span>
                            )) : <span className="text-xs text-gray-500 italic">ไม่มีข้อมูล</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {user && (
                      <div className="pt-6 border-t border-white/5">
                        <button
                          onClick={async () => {
                            if (!selectedItem) return;
                            
                            // Extract properties (stats) from the item
                            const properties: any = {};
                            ITEM_STATS_LIST.forEach(stat => {
                              const val = selectedItem[stat.key];
                              // Only include stats that are not undefined, not null, and greater than 0
                              if (val !== undefined && val !== null && Number(val) > 0) {
                                properties[stat.key] = val;
                              }
                            });

                            try {
                              await revertToPending(activeCategory, selectedItem, properties);
                              toast.success('ย้ายข้อมูลกลับไปรอตรวจสอบแล้ว', {
                                description: `คุณสามารถแก้ไขข้อมูลของ ${selectedItem.name} ได้ในหน้า "รอตรวจสอบ"`,
                                className: 'glass-container !bg-slate-900 !border-amber-500/50 !text-white',
                              });
                              
                              // Update local state to show the review panel immediately
                              setSelectedItem({ ...selectedItem, verification_status: 1 });
                              
                              // Refresh data
                              await refreshData();
                            } catch (error) {
                              console.error('Error reverting to pending:', error);
                              toast.error('เกิดข้อผิดพลาด', {
                                description: 'ไม่สามารถย้ายข้อมูลได้ในขณะนี้',
                                className: 'glass-container !bg-slate-900 !border-red-500/50 !text-white',
                              });
                            }
                          }}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <Edit3 size={18} />
                          แก้ไขข้อมูลอีกครั้ง
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Status 0: Submission Form */}
                {selectedItem.verification_status === 0 && (
                  <div className="glass-container p-8 border-indigo-500/30">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Edit3 size={14} /> กรอกข้อมูลไอเทม
                    </h4>
                    <form onSubmit={handleSubmitUpdate} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อไอเทมใหม่</label>
                          <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rank (ระดับ)</label>
                          <CustomSelect
                            value={newRank}
                            onChange={setNewRank}
                            options={RANK_OPTIONS}
                            placeholder="เลือกความแรร์..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทสวมใส่</label>
                          <CustomSelect
                            value={newTypeWear}
                            onChange={setNewTypeWear}
                            placeholder="เลือกประเภท..."
                            options={[
                              { value: 'avatar', label: 'Avatar' },
                              { value: 'avatarset', label: 'Avatar Set' },
                              { value: 'costumes', label: 'Costumes' },
                            ]}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">จัดการคุณสมบัติ (Item Stats)</label>
                          <button
                            type="button"
                            onClick={addStatRow}
                            className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
                          >
                            <Plus size={12} /> เพิ่มคุณสมบัติ
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {dynamicStats.map((stat, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex gap-3 items-center"
                            >
                              <div className="flex-1">
                                <CustomSelect
                                  value={stat.key}
                                  onChange={(val) => updateStatRow(index, 'key', val)}
                                  options={ITEM_STATS_LIST.map(s => ({ value: s.key, label: s.label }))}
                                  placeholder="เลือกคุณสมบัติ..."
                                  showSearch={true}
                                  className="!rounded-xl"
                                />
                              </div>
                              <div className="w-24">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={stat.value}
                                  onChange={(e) => {
                                    let val = e.target.value;
                                    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                      val = val.replace(/^(-?)0+(?!$|\.)/, '$1');
                                      updateStatRow(index, 'value', val);
                                    }
                                  }}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStatRow(index)}
                                className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </motion.div>
                          ))}
                          {dynamicStats.length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                              <p className="text-xs text-gray-500 font-bold italic">ยังไม่มีการเพิ่มคุณสมบัติ</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">คำอธิบาย</label>
                        <textarea
                          rows={3}
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ไอเทมที่เกี่ยวข้อง</label>
                        </div>
                        <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-2 focus-within:border-indigo-500 transition-all min-h-[100px] items-start">
                          {newRelateItems.map((item, idx) => (
                            <motion.span 
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 group border border-slate-700 hover:border-indigo-500/50 transition-all"
                            >
                              {item}
                              <button 
                                type="button" 
                                onClick={() => setNewRelateItems(newRelateItems.filter((_, i) => i !== idx))}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </motion.span>
                          ))}
                          <input
                            type="text"
                            placeholder={newRelateItems.length === 0 ? "ชื่อไอเทม, ชื่อไอเทม..." : ""}
                            value={relateItemInput}
                            onChange={(e) => setRelateItemInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
                                e.preventDefault();
                                const val = relateItemInput.trim().replace(/,$/, '');
                                if (val && !newRelateItems.includes(val)) {
                                  setNewRelateItems([...newRelateItems, val]);
                                  setRelateItemInput('');
                                }
                              } else if (e.key === 'Backspace' && !relateItemInput && newRelateItems.length > 0) {
                                setNewRelateItems(newRelateItems.slice(0, -1));
                              }
                            }}
                            onBlur={() => {
                              const val = relateItemInput.trim().replace(/,$/, '');
                              if (val && !newRelateItems.includes(val)) {
                                setNewRelateItems([...newRelateItems, val]);
                                setRelateItemInput('');
                              }
                            }}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white min-w-[120px] py-1"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 ml-1 italic">*พิมพ์ชื่อไอเทมแล้วกด Space bar หรือลูกน้ำ (,) เพื่อเพิ่มแท็ก</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">แหล่งที่มา</label>
                        </div>
                        <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-2 focus-within:border-indigo-500 transition-all min-h-[100px] items-start">
                          {newWhereToFindItems.map((item, idx) => (
                            <motion.span 
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 group border border-slate-700 hover:border-indigo-500/50 transition-all"
                            >
                              {item}
                              <button 
                                type="button" 
                                onClick={() => setNewWhereToFindItems(newWhereToFindItems.filter((_, i) => i !== idx))}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </motion.span>
                          ))}
                          <input
                            type="text"
                            placeholder={newWhereToFindItems.length === 0 ? "แหล่งที่มา..." : ""}
                            value={whereToFindInput}
                            onChange={(e) => setWhereToFindInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
                                e.preventDefault();
                                const val = whereToFindInput.trim().replace(/,$/, '');
                                if (val && !newWhereToFindItems.includes(val)) {
                                  setNewWhereToFindItems([...newWhereToFindItems, val]);
                                  setWhereToFindInput('');
                                }
                              } else if (e.key === 'Backspace' && !whereToFindInput && newWhereToFindItems.length > 0) {
                                setNewWhereToFindItems(newWhereToFindItems.slice(0, -1));
                              }
                            }}
                            onBlur={() => {
                              const val = whereToFindInput.trim().replace(/,$/, '');
                              if (val && !newWhereToFindItems.includes(val)) {
                                setNewWhereToFindItems([...newWhereToFindItems, val]);
                                setWhereToFindInput('');
                              }
                            }}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white min-w-[120px] py-1"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 ml-1 italic">*พิมพ์แหล่งที่มาแล้วกด Space bar หรือลูกน้ำ (,) เพื่อเพิ่มแท็ก</p>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send size={18} />
                            ส่งข้อมูลเพื่อตรวจสอบ
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* Status 1: Admin Review (Visible to everyone, but only Admin can edit) */}
                {selectedItem.verification_status === 1 && (
                  <div className="glass-container p-6 border-amber-500/20 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">
                              {user ? 'แผงควบคุมแอดมิน' : 'ข้อมูลที่กำลังรอการตรวจสอบ'}
                            </h4>
                            <span className="text-[10px] font-black text-amber-500/70 bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                              Original ID: {pendingUpdate?.original_id}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">
                            {user ? 'ตรวจสอบและแก้ไขข้อมูลก่อนอนุมัติ' : 'ข้อมูลนี้ถูกเสนอโดยผู้เล่นและกำลังรอการตรวจสอบจากแอดมิน'}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">รอดำเนินการ</span>
                      </div>
                    </div>
                    
                    {pendingUpdate ? (
                      <div className="space-y-8">
                        {/* Basic Info Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Type size={12} className="text-gray-500" />
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ชื่อไอเทม</label>
                            </div>
                            <input
                              type="text"
                              value={adminEditName}
                              onChange={(e) => setAdminEditName(e.target.value)}
                              disabled={!user}
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white font-bold disabled:opacity-70 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Star size={12} className="text-gray-500" />
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ระดับความแรร์ (Rank)</label>
                            </div>
                            <CustomSelect
                              value={adminEditRank}
                              onChange={setAdminEditRank}
                              disabled={!user}
                              options={RANK_OPTIONS}
                              placeholder="เลือกความแรร์..."
                              className="!rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Description Section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText size={12} className="text-gray-500" />
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">คำอธิบาย</label>
                          </div>
                          <textarea
                            rows={3}
                            value={adminEditDesc}
                            onChange={(e) => setAdminEditDesc(e.target.value)}
                            disabled={!user}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white resize-none font-medium leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Category Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers size={12} className="text-gray-500" />
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ประเภทสวมใส่</label>
                            </div>
                            <CustomSelect
                              value={adminEditTypeWear}
                              onChange={setAdminEditTypeWear}
                              disabled={!user}
                              placeholder="เลือกประเภท..."
                              options={[
                                { value: 'avatar', label: 'Avatar' },
                                { value: 'avatarset', label: 'Avatar Set' },
                                { value: 'costumes', label: 'Costumes' },
                              ]}
                              className="!rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Link2 size={12} className="text-gray-500" />
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ไอเทมที่เกี่ยวข้อง</label>
                            </div>
                            <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-2 focus-within:border-indigo-500 transition-all min-h-[60px] items-start">
                              {adminEditRelateItems.map((item, idx) => (
                                <span key={idx} className="bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 border border-indigo-500/20">
                                  {item}
                                  {user && (
                                    <button type="button" onClick={() => setAdminEditRelateItems(adminEditRelateItems.filter((_, i) => i !== idx))} className="text-indigo-500/50 hover:text-red-400"><X size={10} /></button>
                                  )}
                                </span>
                              ))}
                              {user && (
                                <input
                                  type="text"
                                  value={adminEditRelateInput}
                                  onChange={(e) => setAdminEditRelateInput(e.target.value)}
                                  onKeyDown={handleAdminRelateKeyDown}
                                  onBlur={() => {
                                    const val = adminEditRelateInput.trim().replace(/,$/, '');
                                    if (val && !adminEditRelateItems.includes(val)) {
                                      setAdminEditRelateItems([...adminEditRelateItems, val]);
                                      setAdminEditRelateInput('');
                                    }
                                  }}
                                  placeholder="พิมพ์แล้วกด Space..."
                                  className="flex-1 bg-transparent border-none outline-none text-xs text-white min-w-[100px] py-0.5"
                                />
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin size={12} className="text-gray-500" />
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">แหล่งที่มา</label>
                            </div>
                            <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-2 focus-within:border-indigo-500 transition-all min-h-[60px] items-start">
                              {adminEditWhereToFindItems.map((item, idx) => (
                                <span key={idx} className="bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 border border-emerald-500/20">
                                  {item}
                                  {user && (
                                    <button type="button" onClick={() => setAdminEditWhereToFindItems(adminEditWhereToFindItems.filter((_, i) => i !== idx))} className="text-emerald-500/50 hover:text-red-400"><X size={10} /></button>
                                  )}
                                </span>
                              ))}
                              {user && (
                                <input
                                  type="text"
                                  value={adminEditWhereToFindInput}
                                  onChange={(e) => setAdminEditWhereToFindInput(e.target.value)}
                                  onKeyDown={handleAdminWhereKeyDown}
                                  onBlur={() => {
                                    const val = adminEditWhereToFindInput.trim().replace(/,$/, '');
                                    if (val && !adminEditWhereToFindItems.includes(val)) {
                                      setAdminEditWhereToFindItems([...adminEditWhereToFindItems, val]);
                                      setAdminEditWhereToFindInput('');
                                    }
                                  }}
                                  placeholder="พิมพ์แล้วกด Space..."
                                  className="w-full bg-transparent border-none outline-none text-xs text-white min-w-[100px] py-0.5"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats Section */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap size={12} className="text-indigo-400" />
                              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">คุณสมบัติ (Stats)</label>
                            </div>
                            {user && (
                              <button
                                type="button"
                                onClick={addAdminStatRow}
                                className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 border border-indigo-500/20"
                              >
                                <Plus size={12} /> เพิ่มคุณสมบัติ
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {adminEditStats.map((stat, index) => (
                              <div key={index} className="flex gap-3 items-center bg-slate-950/30 p-2 rounded-xl border border-slate-800/50">
                                <div className="flex-1">
                                  <CustomSelect
                                    value={stat.key}
                                    onChange={(val) => updateAdminStatRow(index, 'key', val)}
                                    disabled={!user}
                                    options={ITEM_STATS_LIST.map(s => ({ value: s.key, label: s.label }))}
                                    placeholder="เลือกคุณสมบัติ..."
                                    showSearch={true}
                                    className="!rounded-lg !py-2"
                                  />
                                </div>
                                <div className="w-20">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={stat.value}
                                    disabled={!user}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                                        val = val.replace(/^(-?)0+(?!$|\.)/, '$1');
                                        updateAdminStatRow(index, 'value', val);
                                      }
                                    }}
                                    placeholder="0"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-black focus:outline-none focus:border-indigo-500 transition-all text-indigo-400 text-center disabled:opacity-70"
                                  />
                                </div>
                                {user && (
                                  <button
                                    type="button"
                                    onClick={() => removeAdminStatRow(index)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {adminEditStats.length === 0 && (
                              <div className="py-6 text-center border-2 border-dashed border-slate-800 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ไม่มีคุณสมบัติเพิ่มเติม</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Section */}
                        {user && (
                          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
                            <button
                              onClick={handleApprove}
                              disabled={isAdminActionLoading}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                            >
                              {isAdminActionLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                                  อนุมัติและบันทึกข้อมูล
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleReject}
                              disabled={isAdminActionLoading}
                              className="flex-1 bg-slate-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 font-black py-4 rounded-2xl border border-slate-700 hover:border-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                            >
                              {isAdminActionLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <XCircle size={18} className="group-hover:scale-110 transition-transform" />
                                  ปฏิเสธคำขอแก้ไข
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-xs text-gray-400 font-bold">กำลังดึงข้อมูลที่เสนอ...</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl p-8 md:p-10"
            >
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 text-gray-400 transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
                  <User size={32} />
                </div>
                <h2 className="text-2xl font-black text-white">Admin Login</h2>
                <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">เข้าสู่ระบบเพื่อจัดการข้อมูล</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
                  />
                </div>

                {loginError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{loginError}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {loginLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} />
                      เข้าสู่ระบบ
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
