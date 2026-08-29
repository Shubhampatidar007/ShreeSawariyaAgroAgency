import { useQuery } from "@tanstack/react-query";
import { Building2, Github, GitFork, Link as LinkIcon, MapPin, Star } from "lucide-react";

// Change this to your GitHub username.
const GITHUB_USERNAME = "Shubhampatidar007";

interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  location: string | null;
  blog: string | null;
  company: string | null;
  html_url: string;
}

interface GithubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
}

async function fetchGithubUser(): Promise<GithubUser> {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
  if (!res.ok) throw new Error("Failed to load GitHub profile");
  return res.json();
}

async function fetchGithubRepos(): Promise<GithubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=10`,
  );
  if (!res.ok) throw new Error("Failed to load GitHub repos");
  const data: GithubRepo[] = await res.json();
  return data.filter((repo) => !repo.fork).slice(0, 6);
}

export function AboutGithubProfile() {
  const userQuery = useQuery({
    queryKey: ["github-profile", GITHUB_USERNAME],
    queryFn: fetchGithubUser,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const reposQuery = useQuery({
    queryKey: ["github-repos", GITHUB_USERNAME],
    queryFn: fetchGithubRepos,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  return (
    <section id="github" className="relative overflow-hidden border-t border-white/10 bg-[#050805] py-28 sm:py-40">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,255,148,0.08),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="about-scroll-content relative z-[1] mx-auto w-[min(100%-1.25rem,1200px)]">
        <p className="about-kicker text-xs uppercase tracking-[0.3em] text-emerald-300/70" data-text-reveal="done">
          Open source
        </p>
        <h2 data-cinematic-element="heading" className="mt-4 text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
          Code lives on GitHub
        </h2>
        <p className="mt-6 max-w-2xl text-base text-white/60 sm:text-lg" data-text-reveal="done">
          A live snapshot of what I'm building right now, pulled straight from GitHub.
        </p>

        <div className="mt-16 grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-10">
          <div data-cinematic-element="card" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            {userQuery.isLoading && <ProfileSkeleton />}
            {userQuery.isError && <ErrorState label="profile" />}
            {userQuery.data && <ProfileCard user={userQuery.data} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-2" data-cinematic-element="cards">
            {reposQuery.isLoading &&
              Array.from({ length: 4 }).map((_, i) => <RepoSkeleton key={i} />)}
            {reposQuery.isError && <ErrorState label="repositories" />}
            {reposQuery.data?.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileCard({ user }: { user: GithubUser }) {
  return (
    <div className="flex flex-col items-start gap-5">
      <img src={user.avatar_url} alt={user.name ?? user.login} className="h-20 w-20 rounded-full border border-white/15 sm:h-24 sm:w-24" loading="lazy" width={96} height={96} />
      <div>
        <h3 className="text-xl font-semibold text-white">{user.name ?? user.login}</h3>
        <p className="text-sm text-white/50">@{user.login}</p>
      </div>

      {user.bio && <p className="text-sm leading-relaxed text-white/70">{user.bio}</p>}

      <div className="flex flex-wrap gap-2 text-xs text-white/50">
        {user.company && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1">
            <Building2 className="h-3.5 w-3.5" /> {user.company}
          </span>
        )}
        {user.location && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1">
            <MapPin className="h-3.5 w-3.5" /> {user.location}
          </span>
        )}
        {user.blog && (
          <a href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 transition-colors hover:border-emerald-400/40 hover:text-emerald-300">
            <LinkIcon className="h-3.5 w-3.5" /> Website
          </a>
        )}
      </div>

      <dl className="grid w-full grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
        <div><dt className="text-[11px] uppercase tracking-wide text-white/40">Repos</dt><dd className="mt-1 text-lg font-semibold text-white">{user.public_repos}</dd></div>
        <div><dt className="text-[11px] uppercase tracking-wide text-white/40">Followers</dt><dd className="mt-1 text-lg font-semibold text-white">{user.followers}</dd></div>
        <div><dt className="text-[11px] uppercase tracking-wide text-white/40">Following</dt><dd className="mt-1 text-lg font-semibold text-white">{user.following}</dd></div>
      </dl>

      <a href={user.html_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-400/20">
        <Github className="h-4 w-4" /> View full profile
      </a>
    </div>
  );
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  return (
    <a data-cinematic-element="card" href={repo.html_url} target="_blank" rel="noreferrer" className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-emerald-400/30 hover:bg-white/[0.04]">
      <div>
        <h4 className="truncate text-sm font-semibold text-white group-hover:text-emerald-300">{repo.name}</h4>
        <p className="mt-2 line-clamp-2 text-xs text-white/55">{repo.description ?? "No description provided."}</p>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-white/45">
        {repo.language && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {repo.language}</span>}
        <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {repo.stargazers_count}</span>
        <span className="inline-flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> {repo.forks_count}</span>
      </div>
    </a>
  );
}

function ProfileSkeleton() {
  return <div className="animate-pulse space-y-4"><div className="h-20 w-20 rounded-full bg-white/10" /><div className="h-4 w-32 rounded bg-white/10" /><div className="h-3 w-full rounded bg-white/10" /><div className="h-3 w-2/3 rounded bg-white/10" /></div>;
}

function RepoSkeleton() {
  return <div data-cinematic-element="card" className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="h-4 w-1/2 rounded bg-white/10" /><div className="mt-3 h-3 w-full rounded bg-white/10" /><div className="mt-2 h-3 w-2/3 rounded bg-white/10" /></div>;
}

function ErrorState({ label }: { label: string }) {
  return <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200/80">Couldn't load {label} right now — GitHub's public API may be rate-limited. Try again shortly.</p>;
}
