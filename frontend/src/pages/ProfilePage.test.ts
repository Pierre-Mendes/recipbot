import { fireEvent, render, screen } from '@testing-library/vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateProfile = vi.fn()
const changePassword = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { name: 'Ana', email: 'ana@example.com' },
    updateProfile,
    changePassword,
  }),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

import ProfilePage from '@/pages/ProfilePage.vue'

describe('ProfilePage', () => {
  beforeEach(() => {
    updateProfile.mockReset().mockResolvedValue(undefined)
    changePassword.mockReset().mockResolvedValue(undefined)
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  it('prefills the account form from the current user', () => {
    render(ProfilePage)
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com')
  })

  it('submits profile changes and toasts on success', async () => {
    render(ProfilePage)
    await fireEvent.update(screen.getByLabelText('Nome'), 'Ana Maria')
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar dados' }))

    expect(updateProfile).toHaveBeenCalledWith({ name: 'Ana Maria', email: 'ana@example.com' })
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('submits a password change with the three fields', async () => {
    render(ProfilePage)
    await fireEvent.update(screen.getByLabelText('Senha atual'), 'old-secret')
    await fireEvent.update(screen.getByLabelText('Nova senha'), 'new-secret-1')
    await fireEvent.update(screen.getByLabelText('Confirmar nova senha'), 'new-secret-1')
    await fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))

    expect(changePassword).toHaveBeenCalledWith({
      current_password: 'old-secret',
      password: 'new-secret-1',
      password_confirmation: 'new-secret-1',
    })
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('shows an error toast when the update fails', async () => {
    updateProfile.mockRejectedValue({ response: { data: { message: 'E-mail já em uso' } } })
    render(ProfilePage)
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar dados' }))

    expect(toastError).toHaveBeenCalledWith('E-mail já em uso')
  })
})
