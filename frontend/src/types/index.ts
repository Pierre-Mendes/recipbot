export interface User {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  user_id: number
  title: string
  ingredients: string[]
  instructions?: string[] | null
  tags: string[]
  source_url: string | null
  created_at: string
  updated_at: string
}

export interface PaginationMeta {
  current_page: number
  total: number
  per_page: number
  last_page: number
}

export interface ApiMeta {
  pagination?: PaginationMeta
  search_time_ms?: number
  cache_hit?: boolean
  request_id?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  meta?: ApiMeta
}

export interface PaginatedRecipes {
  data: Recipe[]
  meta: PaginationMeta
}

export interface LoginResponse {
  data: {
    access_token: string
    token_type: string
    expires_in: number
  }
}

export interface TagCount {
  name: string
  count: number
}

/** Fields the create/update recipe forms collect. */
export interface RecipeFormInput {
  title: string
  ingredients: string[]
  instructions: string[]
  tags: string[]
  source_url?: string | null
}

export interface FromUrlInput {
  url: string
  tags: string[]
}

/**
 * An un-saved recipe extracted from a URL (later: photo/PDF). Importing
 * returns one of these for the user to review and edit; nothing is persisted
 * until they confirm through the normal create flow.
 */
export interface RecipeDraft {
  id: string
  title: string
  ingredients: string[]
  instructions: string[]
  tags: string[]
  source_url: string | null
}

export interface SearchInput {
  tags?: string[]
  query?: string
  page?: number
  per_page?: number
}

/** Shape of a Laravel validation error response (422). */
export interface ApiValidationError {
  message: string
  errors: Record<string, string[]>
}
