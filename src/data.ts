import { supabase } from './lib/supabase';

export interface GameItem {
  id?: number | string;
  name: string;
  url: string;
  verification_status: number;
  description: string;
  rank: string;
  type_wear: string;
  relate_item?: string;
  where_to_find_item?: string;
  [key: string]: any; // Allow for dynamic stats
}

export interface PendingUpdate {
  id: string;
  original_id?: number | string; // Store the original item's ID
  name: string; // This will store the original item's name (from 'name' column)
  item_name: string; // This will store the proposed new name
  table_name?: string;
  description: string;
  rank: string;
  type_wear?: string;
  relate_item?: string;
  where_to_find_item?: string;
  properties?: any;
}

export async function fetchStatusCounts(tableName: string = 'acc_back'): Promise<Record<number, number>> {
  const [res0, res1, res2] = await Promise.all([
    supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('verification_status', 0),
    supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('verification_status', 1),
    supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('verification_status', 2),
  ]);

  return {
    0: res0.count || 0,
    1: res1.count || 0,
    2: res2.count || 0
  };
}

export interface DetailedStats {
  total: number;
  status0: number;
  status1: number;
  status2: number;
  pendingUpdates: number;
  todayPending: number;
  todayApproved: number;
}

export async function fetchDetailedStats(tableName: string = 'acc_back'): Promise<DetailedStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [res0, res1, res2, resPending, resTodayPending, resTodayApproved] = await Promise.all([
    supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('verification_status', 0),
    supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('verification_status', 1),
    supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('verification_status', 2),
    supabase.from('pending_updates').select('*', { count: 'exact', head: true }),
    supabase.from('pending_updates').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from(tableName).select('*', { count: 'exact', head: true }).eq('verification_status', 2).gte('updated_at', todayISO),
  ]);

  const status0 = res0.count || 0;
  const status1 = res1.count || 0;
  const status2 = res2.count || 0;

  return {
    total: status0 + status1 + status2,
    status0,
    status1,
    status2,
    pendingUpdates: resPending.count || 0,
    todayPending: resTodayPending.count || 0,
    todayApproved: resTodayApproved.count || 0
  };
}

export async function fetchItemsByStatus(tableName: string = 'acc_back', status: number | 'all', page: number = 1, pageSize: number = 30): Promise<{ data: GameItem[], count: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(tableName)
    .select('*', { count: 'exact' });

  if (status !== 'all') {
    query = query.eq('verification_status', status);
  }

  const { data, count, error } = await query
    .range(from, to)
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching items from ${tableName}:`, error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}

export async function submitUpdate(
  tableName: string,
  originalId: number | string,
  originalName: string, 
  newName: string, 
  description: string, 
  rank: string,
  type_wear: string,
  relate_item: string,
  where_to_find_item: string,
  properties: any
) {
  // 1. Insert into pending_updates
  const { error: insertError } = await supabase
    .from('pending_updates')
    .insert({
      original_id: originalId,
      name: originalName, // name stores the old name
      item_name: newName, // item_name stores the new name
      table_name: tableName,
      description: description,
      rank: rank,
      type_wear: type_wear,
      relate_item: relate_item,
      where_to_find_item: where_to_find_item,
      properties: properties
    });

  if (insertError) throw insertError;

  // 2. Update the specific table status to 1 (checking)
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ verification_status: 1 })
    .eq('name', originalName);

  if (updateError) throw updateError;
}

export async function getPendingUpdate(itemName: string, tableName: string): Promise<PendingUpdate | null> {
  const { data, error } = await supabase
    .from('pending_updates')
    .select('*')
    .eq('name', itemName) // Query by the original name (which is now in 'name' column)
    .eq('table_name', tableName)
    .single();

  if (error) return null;
  return data;
}

export async function approveUpdate(originalName: string, update: PendingUpdate) {
  const tableName = update.table_name || 'acc_back';
  
  // 1. Update the specific table with new data and status 2
  const { error: updateError } = await supabase
    .from(tableName)
    .update({
      name: update.item_name, // update.item_name is the new name
      description: update.description,
      rank: update.rank,
      type_wear: update.type_wear,
      relate_item: update.relate_item,
      where_to_find_item: update.where_to_find_item,
      verification_status: 2,
      ...update.properties // Spread properties directly into columns if they match
    })
    .eq('name', originalName);

  if (updateError) throw updateError;

  // 2. Delete from pending_updates
  const { error: deleteError } = await supabase
    .from('pending_updates')
    .delete()
    .eq('id', update.id);

  if (deleteError) throw deleteError;
}

export async function rejectUpdate(originalName: string, update: PendingUpdate) {
  const tableName = update.table_name || 'acc_back';

  // 1. Update the specific table status back to 0
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ verification_status: 0 })
    .eq('name', originalName);

  if (updateError) throw updateError;

  // 2. Delete from pending_updates
  const { error: deleteError } = await supabase
    .from('pending_updates')
    .delete()
    .eq('id', update.id);

  if (deleteError) throw deleteError;
}

export async function revertToPending(tableName: string, item: GameItem, properties: any) {
  // 1. Insert into pending_updates
  const { error: insertError } = await supabase
    .from('pending_updates')
    .insert({
      original_id: item.id,
      name: item.name, // name stores the old name
      item_name: item.name, // item_name stores the new name (same as old initially)
      table_name: tableName,
      description: item.description || '',
      rank: item.rank || '',
      type_wear: item.type_wear || '',
      relate_item: item.relate_item || '',
      where_to_find_item: item.where_to_find_item || '',
      properties: properties
    });

  if (insertError) throw insertError;

  // 2. Update the specific table status to 1 (checking)
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ verification_status: 1 })
    .eq('name', item.name);

  if (updateError) throw updateError;
}

export async function fetchItems(tableName: string = 'acc_back'): Promise<GameItem[]> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(100);
  
  if (error) return [];
  return data || [];
}
