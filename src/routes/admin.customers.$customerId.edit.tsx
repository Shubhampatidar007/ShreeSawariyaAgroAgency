import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { shopStore, useShopStore } from "@/lib/shop-store";

export const Route = createFileRoute("/admin/customers/$customerId/edit")({
  head: () => ({
    meta: [
      { title: "Edit Customer — Admin" },
      { name: "description", content: "Update farmer contact details, village and account status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditCustomerPage,
});

function EditCustomerPage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const customer = useShopStore((s) => s.customers.find((c) => c.id === customerId));

  if (!customer) {
    return (
      <EmptyState
        icon={UserX}
        title="Customer not found"
        description="This customer may have been deleted. Go back to the customer list to continue."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Customers", to: "/admin/customers" },
          { label: customer.name },
          { label: "Edit" },
        ]}
        eyebrow="Customers"
        title={`Edit ${customer.name}`}
        description="Update contact information, village mapping and account status."
      />
      <CustomerForm
        defaultValues={customer}
        submitLabel="Save changes"
        onCancel={() => navigate({ to: "/admin/customers/$customerId", params: { customerId } })}
        onSubmit={(values) => {
          shopStore.updateCustomer(customerId, values);
          toast.success("Customer updated");
          navigate({ to: "/admin/customers/$customerId", params: { customerId } });
        }}
      />
    </div>
  );
}