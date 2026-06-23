import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  language: string;
  openPRs: number;
  lastReview: string;
  status: string;
}

export interface SyncResponse {
  status: string;
  repoId: string;
  triggeredAt: string;
  message: string;
}

export interface UserProfile {
  id: number;
  login: string;
  name: string;
  avatarUrl: string;
}

export interface HealthCheck {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

/**
 * ApiService
 *
 * Handles all HTTP interactions with the Yulu-Lens backend API.
 * Uses Angular's Observable patterns for reactive data flow.
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Fetches the list of monitored repositories. */
  getRepositories(): Observable<{ repositories: Repository[] }> {
    return this.http.get<{ repositories: Repository[] }>(
      `${this.apiUrl}/protected/repos`
    );
  }

  /** Triggers a manual sync for the given repository. */
  triggerSync(repoId: number): Observable<SyncResponse> {
    return this.http.post<SyncResponse>(
      `${this.apiUrl}/protected/repos/${repoId}/sync`,
      {}
    );
  }

  /** Fetches the current user profile from the JWT. */
  getProfile(): Observable<{ user: UserProfile }> {
    return this.http.get<{ user: UserProfile }>(
      `${this.apiUrl}/protected/me`
    );
  }

  /** Simple health check to verify backend connectivity. */
  healthCheck(): Observable<HealthCheck> {
    return this.http.get<HealthCheck>(`${this.apiUrl}/health`);
  }

  /** Initiates GitHub OAuth login by redirecting to the backend. */
  loginWithGithub(): void {
    window.location.href = `${this.apiUrl}/auth/github`;
  }
}
