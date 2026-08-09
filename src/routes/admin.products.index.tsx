import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { AdminProductCard } from "@/components/shared/EntityCards";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { shopStore, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/products/")({
  head: () => ({
    meta: [
      { title: "Published Products — Admin" },
      { name: "description", content: "Manage storefront products, visibility and stock." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const products = useShopStore((s) => s.products);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter(
      (product) =>
        !term ||
        product.title.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term),
    );
  }, [products, query]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Products" }]}
        eyebrow="Module"
        title="Published products"
        description="Customer-facing catalogue created from inventory stock."
        actions={
          <Button className="rounded-full" asChild>
            <Link to="/admin/products/publish">
              <Upload className="size-4" /> Publish product
            </Link>
          </Button>
        }
      />

      <SearchToolbar value={query} onChange={setQuery} placeholder="Search product or category…" />

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No published products"
          description="Publish an inventory item to make it visible on the storefront."
          action={
            <Button className="rounded-full" asChild>
              <Link to="/admin/products/publish">Publish product</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((product) => (
            <AdminProductCard
              key={product.id}
              product={product}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      shopStore.updateProduct(product.id, {
                        visibility: product.visibility === "public" ? "hidden" : "public",
                      })
                    }
                  >
                    {product.visibility === "public" ? "Hide" : "Show"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => shopStore.updateProduct(product.id, { status: "archived" })}
                  >
                    Archive
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" size="sm" className="rounded-full text-destructive">
                        Delete
                      </Button>
                    }
                    title={`Delete ${product.title}?`}
                    description="The product is removed from the storefront. Inventory stock is kept."
                    confirmLabel="Delete"
                    onConfirm={() => shopStore.deleteProduct(product.id)}
                  />
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}