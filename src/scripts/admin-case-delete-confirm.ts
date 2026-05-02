const DELETE_CASE_MESSAGE = 'Tem certeza que deseja excluir este case? Essa ação remove o case, suas imagens e vídeo e não pode ser desfeita.';

document.querySelectorAll<HTMLFormElement>('form[data-case-delete-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (window.confirm(DELETE_CASE_MESSAGE)) return;
    event.preventDefault();
  });
});
