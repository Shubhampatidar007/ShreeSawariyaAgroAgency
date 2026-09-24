import { useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shopStore, useShopStore } from "@/lib/shop-store";
import type { EntityStatus, Supplier } from "@/types/business";

export const Route = createFileRoute("/admin/suppliers/$supplierId/edit")({
  head: () => ({ meta: [
    { title: "Edit Supplier — Admin" },
    { name: "description", content: "Update supplier contact details, company information and account status." },
    { name: "robots", content: "noindex" },
  ] }),
  component: EditSupplierPage,
});

function EditSupplierPage() {
  const { supplierId } = Route.useParams();
  const navigate = useNavigate();
  const supplier = useShopStore((s) => s.suppliers.find((item) => item.id === supplierId));

  if (!supplier) return <EmptyState icon={Truck} title="Supplier not found" description="This supplier may have been deleted. Go back to the supplier list to continue." action={<Button className="rounded-full" onClick={() => navigate({ to: "/admin/suppliers" })}>Back to suppliers</Button>} />;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Suppliers", to: "/admin/suppliers" }, { label: supplier.company || supplier.name }, { label: "Edit" }]}
        eyebrow="Suppliers"
        title={`Edit ${supplier.company || supplier.name}`}
        description="Update supplier name, company, contact details, products supplied and account status."
      />
      <SupplierEditForm supplier={supplier} onCancel={() => navigate({ to: "/admin/suppliers/$supplierId", params: { supplierId } })} onSaved={() => { toast.success("Supplier updated"); navigate({ to: "/admin/suppliers/$supplierId", params: { supplierId } }); }} />
    </div>
  );
}

function SupplierEditForm({ supplier, onCancel, onSaved }: { supplier: Supplier; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(supplier.name);
  const [company, setCompany] = useState(supplier.company);
  const [mobile, setMobile] = useState(supplier.mobile);
  const [email, setEmail] = useState(supplier.email);
  const [gstin, setGstin] = useState(supplier.gstin);
  const [address, setAddress] = useState(supplier.address);
  const [products, setProducts] = useState(supplier.productsSupplied.join(", "));
  const [status, setStatus] = useState<EntityStatus>(supplier.status);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error("Supplier name is required");
    if (!company.trim()) return toast.error("Company name is required");
    setSaving(true);
    try {
      await shopStore.updateSupplier(supplier.id, {
        name: name.trim(), company: company.trim(), mobile: mobile.trim(), email: email.trim(),
        gstin: gstin.trim(), address: address.trim(),
        productsSupplied: products.split(",").map((item) => item.trim()).filter(Boolean), status,
      });
      onSaved();
    } catch (error) {
      console.error("Supplier update failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to update supplier");
    } finally { setSaving(false); }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader><CardTitle className="text-base">Supplier details</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name" value={name} onChange={setName} required />
            <Field label="Company" value={company} onChange={setCompany} required />
            <Field label="Mobile" value={mobile} onChange={setMobile} />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="GSTIN" value={gstin} onChange={setGstin} />
            <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value) => setStatus(value as EntityStatus)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="blocked">Blocked</SelectItem></SelectContent></Select></div>
            <Field label="Address" value={address} onChange={setAddress} className="sm:col-span-2" />
            <Field label="Products supplied" value={products} onChange={setProducts} className="sm:col-span-2" placeholder="Comma-separated products" />
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="rounded-full" onClick={onCancel} disabled={saving}>Cancel</Button><Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, type = "text", required = false, className = "", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; className?: string; placeholder?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} placeholder={placeholder} /></div>;
}
