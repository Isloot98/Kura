export interface PantryCategory {
  id: number;
  name: string;
}

export interface PantryGroups {
  id: number;
  name: string;
}

export interface PantryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  pantry_categories?: PantryCategory;
  pantry_groups?: PantryGroups;
}

export type ShoppingListItem = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category_id?: string;
  is_checked: boolean;
};

export type ShoppingList = {
  id: string;
  name: string;
  created_at: string;
  shopping_list_items?: ShoppingListItem[];
};

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category_id?: string;
};

export type Recipe = {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  recipe_ingredients: RecipeIngredient[];
};

export type RootStackParamList = {
  Pantry: undefined;
  AddItem: undefined;
  ShoppingList: undefined;
  AddShoppingList: undefined;
  EditShoppingList: { list: ShoppingList };
  RecipeListScreen: undefined;
  AddRecipeScreen: undefined;
  EditRecipeScreen: { recipe: Recipe };
  RecipeDetailScreen: { recipeId: number };
};
