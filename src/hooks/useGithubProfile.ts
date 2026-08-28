import { useEffect, useState } from "react";

export interface GithubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  blog: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

interface State {
  profile: GithubProfile | null;
  loading: boolean;
  error: string | null;
}

export function useGithubProfile(username: string): State {
  const [state, setState] = useState<State>({ profile: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
          headers: { Accept: "application/vnd.github+json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
        const profile = (await response.json()) as GithubProfile;
        setState({ profile, loading: false, error: null });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ profile: null, loading: false, error: error instanceof Error ? error.message : "Unable to load GitHub profile" });
      }
    };
    void load();
    return () => controller.abort();
  }, [username]);

  return state;
}
