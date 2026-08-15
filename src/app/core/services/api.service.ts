import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, Inject, InjectionToken } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success?: boolean;
  Success?: boolean;
  data?: T;
  Data?: T;
  message?: string | null;
  Message?: string | null;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

@Injectable()
export class ApiService {
  constructor(
    private http: HttpClient,
    @Inject(API_BASE_URL) public baseUrl: any
  ) {}

  get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<any>(`${this.baseUrl}${path}`, { params, withCredentials: true }).pipe(
      map((response) => {
        if (response && ('Data' in response || 'data' in response || 'Success' in response || 'success' in response)) {
          return (response.data !== undefined ? response.data : response.Data) as T;
        }
        return response as T;
      }),
      map((result) => result ?? undefined as T)
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<any>(`${this.baseUrl}${path}`, body, { withCredentials: true }).pipe(
      map((response) => {
        if (response && ('Data' in response || 'data' in response || 'Success' in response || 'success' in response)) {
          return (response.data !== undefined ? response.data : response.Data) as T;
        }
        return response as T;
      }),
      map((result) => result ?? undefined as T)
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<any>(`${this.baseUrl}${path}`, body, { withCredentials: true }).pipe(
      map((response) => {
        if (response && ('Data' in response || 'data' in response || 'Success' in response || 'success' in response)) {
          return (response.data !== undefined ? response.data : response.Data) as T;
        }
        return response as T;
      }),
      map((result) => result ?? undefined as T)
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<any>(`${this.baseUrl}${path}`, { withCredentials: true }).pipe(
      map((response) => {
        if (response && ('Data' in response || 'data' in response || 'Success' in response || 'success' in response)) {
          return (response.data !== undefined ? response.data : response.Data) as T;
        }
        return response as T;
      }),
      map((result) => result ?? undefined as T)
    );
  }
}