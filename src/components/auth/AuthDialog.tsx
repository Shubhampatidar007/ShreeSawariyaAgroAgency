import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";

export type AuthMode = "login" | "register";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
};

export function AuthDialog({ open, onOpenChange, mode, onModeChange }: AuthDialogProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result = await authStore.login(
      String(form.get("email") ?? "").trim(),
      String(form.get("password") ?? ""),
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onOpenChange(false);

    toast.success(`${t("auth.welcomeBack", "Welcome back")}, ${result.user.name}`);

    if (result.user.role === "admin" || result.user.role === "staff") {
      void navigate({ to: "/admin" });
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (name.length < 2 || !email.includes("@") || password.length < 6) {
      setError(t("auth.invalid", "Enter your name, a valid email and a 6+ character password."));
      return;
    }
    setBusy(true);
    const result = await authStore.register({
      name,
      email,
      password,
      mobile: String(form.get("mobile") ?? "").trim(),
      village: String(form.get("village") ?? "").trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onOpenChange(false);
    toast.success(`${t("auth.accountCreated", "Account created")} — ${result.user.name}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("auth.title", "Account")}</DialogTitle>
          <DialogDescription>
            {t("auth.subtitle", "Sign in to manage your shop.")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => onModeChange(value as AuthMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("auth.login", "Login")}</TabsTrigger>
            <TabsTrigger value="register">{t("auth.register", "Register")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form className="space-y-3 pt-3" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <Label htmlFor="login-email">{t("auth.email", "Email")}</Label>
                <Input id="login-email" name="email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">{t("auth.password", "Password")}</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                    onClick={() => setShowLoginPassword((value) => !value)}
                    aria-label={
                      showLoginPassword
                        ? t("auth.hidePassword", "Hide password")
                        : t("auth.showPassword", "Show password")
                    }
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {t("auth.login", "Login")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form className="space-y-3 pt-3" onSubmit={handleRegister}>
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">{t("auth.name", "Full name")}</Label>
                <Input id="reg-name" name="name" placeholder="Your name" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-mobile">{t("auth.mobile", "Mobile number")}</Label>
                  <Input id="reg-mobile" name="mobile" placeholder="98765 43210" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-village">{t("auth.village", "Village")}</Label>
                  <Input id="reg-village" name="village" placeholder="Your village" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">{t("auth.email", "Email ")}</Label>
                <Input id="reg-email" name="email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">{t("auth.password", "Password")}</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    name="password"
                    type={showRegisterPassword ? "text" : "password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                    onClick={() => setShowRegisterPassword((value) => !value)}
                    aria-label={
                      showRegisterPassword
                        ? t("auth.hidePassword", "Hide password")
                        : t("auth.showPassword", "Show password")
                    }
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {t("auth.register", "Register")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
