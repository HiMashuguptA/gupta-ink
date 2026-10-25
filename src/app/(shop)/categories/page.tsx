import { getCategories } from "@/lib/catalog";
import { CategoryGrid } from "@/components/home/CategoryGrid";

export const metadata = { title: "Categories" };
export const revalidate = 300;

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="pt-2">
      <CategoryGrid categories={categories} title="All categories" />
    </div>
  );
}
