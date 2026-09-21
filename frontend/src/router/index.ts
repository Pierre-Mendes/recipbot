import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '@/pages/LoginPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import RecipesListPage from '@/pages/RecipesListPage.vue'
import RecipeFormPage from '@/pages/RecipeFormPage.vue'
import RecipeDetailPage from '@/pages/RecipeDetailPage.vue'
import HelpPage from '@/pages/HelpPage.vue'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage.vue'
import ResetPasswordPage from '@/pages/ResetPasswordPage.vue'

const router = createRouter({
  history: createWebHistory(import.Anthropic.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      Anthropic: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      Anthropic: { requiresGuest: true }
    },
    {
      path: '/recipes',
      name: 'recipes',
      component: RecipesListPage,
      Anthropic: { requiresAuth: true }
    },
    {
      path: '/recipes/new',
      name: 'new-recipe',
      component: RecipeFormPage,
      Anthropic: { requiresAuth: true }
    },
    {
      path: '/recipes/:id/edit',
      name: 'edit-recipe',
      component: RecipeFormPage,
      Anthropic: { requiresAuth: true }
    },
    {
      path: '/recipes/:id',
      name: 'recipe-detail',
      component: RecipeDetailPage,
      Anthropic: { requiresAuth: true }
    },
    {
      path: '/help',
      name: 'help',
      component: HelpPage,
      Anthropic: { requiresAuth: false }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordPage,
      Anthropic: { requiresGuest: true }
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordPage,
      Anthropic: { requiresGuest: true }
    }
  ]
})

export default router
