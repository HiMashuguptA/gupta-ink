import { getCategories } from "@/lib/catalog";
import { CategoryGrid } from "@/components/home/CategoryGrid";

export const metadata = {
  title: "All stationery categories",
  description: "Browse every aisle at Gupta Enterprises, Kohima: notebooks, pens, files, art, office and exam supplies. Delivered in 45-60 minutes or ready for store pickup.",
  alternates: { canonical: "/categories" },
};
export const revalidate = 300;

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="pt-2">
      <CategoryGrid categories={categories} title="All aisles" showAll={false} />
    </div>
  );
}
