# Focus Tasks: colocar o site no ar com contas

## 1. GitHub
1. Conecte o GitHub em https://claude.ai/connect-github
2. Crie um repositório (pode ser vazio), por exemplo `focus-tasks`, e mande o nome no chat.

## 2. Supabase (banco + login, gratuito)
1. Entre em https://supabase.com com sua conta Google e clique em **New project** (qualquer nome e região; guarde a senha do banco, não precisa me mandar).
2. Quando o projeto terminar de criar, abra **SQL Editor → New query**, cole todo o conteúdo de `supabase-setup.sql` e clique em **Run**. Deve aparecer "Success".
3. Em **Authentication → Sign In / Providers → Email**, desligue **Confirm email** (o envio de email grátis do Supabase só manda poucos emails por hora; assim ninguém fica preso esperando confirmação).
4. Abra **Project Settings → API** e mande no chat:
   - **Project URL** (algo como `https://abcd.supabase.co`)
   - **anon public** key (pode colar aqui, ela é pública). **Não** mande a `service_role`.

## 3. Login com Google (opcional, dá a foto do Google automaticamente)
Sem isso, o login funciona com email e senha, e cada pessoa pode subir a própria foto.
Quando quiser ativar, eu passo o passo a passo (precisa criar uma credencial no Google Cloud e colar no Supabase).

## Como funciona
- Cada pessoa entra com a própria conta; as tasks, tags, projetos, notas e tempos dela ficam salvos na conta e sincronizam entre dispositivos.
- No primeiro login, o que já está no navegador vai para a conta.
- Ícone de pessoa em cada task: **Share** (os dois veem; nome, nota, data e done sincronizam) ou **Pass** (a task sai da sua lista e vai para a da outra pessoa, com "from Pedro").
- Pode compartilhar com um email de quem ainda não tem conta: a task aparece para a pessoa quando ela entrar com esse email.
- Tag, projeto, ordem e subtasks continuam sendo de cada um.
