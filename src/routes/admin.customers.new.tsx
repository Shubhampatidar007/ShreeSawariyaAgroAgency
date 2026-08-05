import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { shopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/customers/new")({
  head: () => ({
    meta: [
      { title: "Add Customer — AgriKisan Admin" },
      { name: "description", content: "Register a new farmer in the shop khata book." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AddCustomerPage,
});

function AddCustomerPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Customers", to: "/admin/customers" },
          { label: "Add customer" },
        ]}
        eyebrow="Customers"
        title="Add customer"
        description="Create a farmer profile to start recording purchases and khata entries."
      />
      <CustomerForm
        submitLabel="Save customer"
        onCancel={() => navigate({ to: "/admin/customers" })}
        onSubmit={(values) => {
          const created = shopStore.addCustomer({
            ...values,
            joinedOn: new Date().toISOString().slice(0, 10),
            totalPurchases: 0,
            totalPaid: 0,
            currentDue: 0,
            lastPurchase: new Date().toISOString().slice(0, 10),
          });
          toast.success(`${created.name} added to customers`);
          navigate({ to: "/admin/customers/$customerId", params: { customerId: created.id } });
        }}
      />
    </div>
  );
}