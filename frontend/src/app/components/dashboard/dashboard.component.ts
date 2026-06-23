import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Repository } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  /** GitHub App installation URL */
  installUrl: string = environment.githubAppInstallUrl;

  /** Whether the GitHub App was just installed (from redirect query param) */
  justInstalled: boolean = false;

  /** Whether a valid JWT token is stored */
  isAuthenticated: boolean = false;

  /** Current search/filter term */
  searchTerm: string = '';

  /** Loading states */
  loadingRepos: boolean = true;
  loadingHealth: boolean = true;

  /** Backend health status */
  backendStatus: string = 'checking';
  backendVersion: string = '';

  /** List of monitored repositories from the API */
  repositories: Repository[] = [];

  /** Filtered repositories based on search */
  filteredRepositories: Repository[] = [];

  /** Sync in-progress tracker */
  syncingRepoId: number | null = null;

  /** Stats computed from repositories */
  totalRepos: number = 0;
  activeRepos: number = 0;
  totalOpenPRs: number = 0;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // ── Handle OAuth callback — store JWT if present ────────
    this.route.queryParams.subscribe(params => {
      // Detect GitHub App installation redirect
      if (params['setup_action'] === 'install') {
        this.justInstalled = true;
      }

      // Detect OAuth token in URL (from backend redirect)
      if (params['token']) {
        localStorage.setItem('yulu_lens_token', params['token']);
      }
    });

    // Check authentication status
    const token = localStorage.getItem('yulu_lens_token');
    this.isAuthenticated = !!token;

    // ── Load data ──────────────────────────────────────────
    this.checkHealth();
    this.loadRepositories();
  }

  /** Checks backend health endpoint. */
  checkHealth(): void {
    this.loadingHealth = true;
    this.apiService.healthCheck().subscribe(
      (data) => {
        this.backendStatus = data.status;
        this.backendVersion = data.version;
        this.loadingHealth = false;
      },
      (_err) => {
        this.backendStatus = 'offline';
        this.loadingHealth = false;
      }
    );
  }

  /** Loads the repository list from the API. */
  loadRepositories(): void {
    this.loadingRepos = true;
    this.apiService.getRepositories().subscribe(
      (data) => {
        this.repositories = data.repositories;
        this.filteredRepositories = [...this.repositories];
        this.computeStats();
        this.loadingRepos = false;
      },
      (_err) => {
        // If unauthorized or backend down, use empty list
        this.repositories = [];
        this.filteredRepositories = [];
        this.computeStats();
        this.loadingRepos = false;
      }
    );
  }

  /** Computes aggregate stats from the repository list. */
  computeStats(): void {
    this.totalRepos = this.repositories.length;
    this.activeRepos = this.repositories.filter(r => r.status === 'active').length;
    this.totalOpenPRs = this.repositories.reduce((sum, r) => sum + r.openPRs, 0);
  }

  /** Filters repositories based on the search term. */
  filterRepositories(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredRepositories = [...this.repositories];
      return;
    }
    this.filteredRepositories = this.repositories.filter(repo =>
      repo.name.toLowerCase().includes(term) ||
      repo.fullName.toLowerCase().includes(term) ||
      repo.language.toLowerCase().includes(term)
    );
  }

  /** Triggers a manual sync for a repository. */
  syncRepository(repoId: number): void {
    this.syncingRepoId = repoId;
    this.apiService.triggerSync(repoId).subscribe(
      (_data) => {
        this.syncingRepoId = null;
      },
      (_err) => {
        this.syncingRepoId = null;
      }
    );
  }

  /** Initiates GitHub OAuth login. */
  loginWithGithub(): void {
    this.apiService.loginWithGithub();
  }

  /** Dismisses the installation success banner. */
  dismissBanner(): void {
    this.justInstalled = false;
  }

  /** Formats an ISO date string to a human-readable relative time. */
  formatRelativeTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) { return 'Just now'; }
    if (diffMins < 60) { return diffMins + 'm ago'; }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) { return diffHours + 'h ago'; }

    const diffDays = Math.floor(diffHours / 24);
    return diffDays + 'd ago';
  }

  /** Returns a language-specific colour for badges. */
  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      'TypeScript': '#3178c6',
      'JavaScript': '#f1e05a',
      'Python': '#3572A5',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'Java': '#b07219',
      'HCL': '#844FBA',
      'Ruby': '#701516',
      'C++': '#f34b7d',
      'C#': '#178600',
    };
    return colors[language] || '#8b949e';
  }
}
