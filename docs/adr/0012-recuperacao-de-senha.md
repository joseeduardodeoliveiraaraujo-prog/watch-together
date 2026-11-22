# ADR 0012 — Recuperação e troca de senha

- **Status:** aceito
- **Data:** 2026-11-21

## Contexto

Não havia como recuperar a senha esquecida nem trocar a senha estando logado. A confirmação de
e-mail no cadastro continua desligada (ADR 0005), então até aqui o app nunca dependeu de e-mail.

## Decisão

- **Código numérico por e-mail, não link.** O projeto hospedado usa 8 dígitos (o local, 6); o app
  aceita de 6 a 8 e os textos não citam o tamanho. O link precisaria abrir o app a partir do e-mail
  (deep link), o que falha no Expo Go e em alguns apps de e-mail. O código funciona em qualquer
  caso. Fluxo: `resetPasswordForEmail` → `verifyOtp({ type: 'recovery' })` → `updateUser`.
- **Código e nova senha na mesma etapa** (`ForgotPasswordScreen`). Validar o código já cria a
  sessão, e o `Stack.Protected` leva a pessoa para a home na hora; uma etapa posterior para a senha
  nunca apareceria. O resultado da troca é mostrado pelo aviso global (`DialogProvider`), que
  continua na tela depois da navegação.
- **Sem revelar se a conta existe:** a mensagem após pedir o código é sempre "se existir uma conta
  com esse e-mail, enviamos um código" (o Supabase também responde sucesso nos dois casos).
- **Reenvio** com espera de 60 s no app; o Supabase limita os envios por hora.
- **Trocar senha no Perfil** (`ChangePasswordForm`): pede a senha atual e a confere entrando de novo
  com ela antes do `updateUser`, para quem pega o celular desbloqueado não trocar a senha da conta.
- **Envio pelo SMTP da Brevo** (plano gratuito, 300 e-mails/dia, remetente verificado sem domínio
  próprio). O servidor de e-mail padrão do Supabase só entrega para os membros da equipe do
  projeto. A senha SMTP fica só no painel do Supabase, nunca no repositório.
- **Modelo do e-mail** em português com o visual do app: `supabase/templates/recovery.html`
  (fonte da verdade; no projeto hospedado é colado em Authentication → Email Templates → Reset
  Password). `config.toml` aponta para ele só para o ambiente local.

## Riscos

- Remetente Gmail/Outlook enviado pela Brevo pode cair no spam (o texto da tela avisa para conferir
  o spam). Com domínio próprio, autenticar o domínio na Brevo resolve.
- Não usar `supabase config push` sem revisar o `config.toml` inteiro: ele sobrescreve as
  configurações de Auth do projeto hospedado (por exemplo `site_url`).
