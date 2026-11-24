import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function toMeal(r) {
  return {
    id: r.id,
    ts: new Date(r.ts).getTime(),
    label: r.label,
    foods: r.foods || [],
    thumb: r.thumb,
    totals: { calories: r.calories, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g },
  };
}

export async function fetchMeals() {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .gte("ts", since.toISOString())
    .order("ts", { ascending: false });
  if (error) throw error;
  return data.map(toMeal);
}

export async function insertMeal(meal) {
  const { data, error } = await supabase
    .from("meals")
    .insert({
      ts: new Date(meal.ts).toISOString(),
      label: meal.label,
      foods: meal.foods,
      thumb: meal.thumb,
      ...meal.totals,
    })
    .select()
    .single();
  if (error) throw error;
  return toMeal(data);
}

export async function removeMeal(id) {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw error;
}

export async function removeAllMeals() {
  const { error } = await supabase.from("meals").delete().gte("id", 0);
  if (error) throw error;
}

export async function fetchProfile() {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    name: data.name || "",
    goals: { calories: data.calories, protein_g: data.protein_g, carbs_g: data.carbs_g, fat_g: data.fat_g },
  };
}

export async function saveProfile(userId, profile) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, name: profile.name, ...profile.goals });
  if (error) throw error;
}

export async function fetchMyFoods() {
  const { data, error } = await supabase.from("my_foods").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function insertMyFood(food) {
  const { data, error } = await supabase.from("my_foods").insert(food).select().single();
  if (error) throw error;
  return data;
}

export async function removeMyFood(id) {
  const { error } = await supabase.from("my_foods").delete().eq("id", id);
  if (error) throw error;
}
