const DELETE_CASE_MESSAGE = 'Tem certeza que deseja excluir este case? Essa ação remove o case, suas imagens e vídeo e não pode ser desfeita.';
const DELETE_TESTIMONIAL_MESSAGE = 'Tem certeza que deseja excluir esta recomendação? Essa ação não pode ser desfeita.';
const DELETE_SHARED_PAGE_MESSAGE = 'Tem certeza que deseja excluir esta página? O link deixará de funcionar e não pode ser desfeito.';

document.querySelectorAll<HTMLFormElement>('form[data-case-delete-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (window.confirm(DELETE_CASE_MESSAGE)) return;
    event.preventDefault();
  });
});

document.querySelectorAll<HTMLFormElement>('form[data-testimonial-delete-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (window.confirm(DELETE_TESTIMONIAL_MESSAGE)) return;
    event.preventDefault();
  });
});

document.querySelectorAll<HTMLFormElement>('form[data-shared-page-delete-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (window.confirm(DELETE_SHARED_PAGE_MESSAGE)) return;
    event.preventDefault();
  });
});

export {};
