function getCaseCards(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-case-card]')];
}

function getCardAfterPointer(container: HTMLElement, x: number, y: number) {
  const cards = getCaseCards(container).filter((card) => !card.classList.contains('is-dragging'));

  return cards.find((card) => {
    const box = card.getBoundingClientRect();
    const centerX = box.left + box.width / 2;

    if (y < box.top) return true;
    return y <= box.bottom && x < centerX;
  }) || null;
}

async function saveCaseOrder(panel: HTMLElement, list: HTMLElement) {
  const status = panel.querySelector<HTMLElement>('[data-case-order-status]');
  const ids = getCaseCards(list).map((card) => Number(card.dataset.caseId)).filter(Number.isInteger);

  if (ids.length === 0) return;
  if (status) status.textContent = 'Salvando ordem...';

  try {
    const response = await fetch('/api/panel/cases/order', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) throw new Error(await response.text());
    if (status) status.textContent = 'Ordem salva.';
  } catch {
    if (status) status.textContent = 'Não foi possível salvar a ordem. Recarregue a página e tente novamente.';
  }
}

function initCaseOrder(panel: HTMLElement) {
  const list = panel.querySelector<HTMLElement>('[data-case-order-list]');
  if (!list) return;

  let draggedCard: HTMLElement | null = null;
  let orderChanged = false;

  list.addEventListener('dragstart', (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-case-card]');
    if (!card) return;

    draggedCard = card;
    orderChanged = false;

    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    event.dataTransfer?.setData('text/plain', String(card.dataset.caseId || ''));
    event.dataTransfer?.setDragImage(card, offsetX, offsetY);
    requestAnimationFrame(() => card.classList.add('is-dragging'));
  });

  list.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!draggedCard) return;

    const nextCard = getCardAfterPointer(list, event.clientX, event.clientY);
    if (nextCard && nextCard !== draggedCard) {
      list.insertBefore(draggedCard, nextCard);
      orderChanged = true;
    } else if (!nextCard && list.lastElementChild !== draggedCard) {
      list.appendChild(draggedCard);
      orderChanged = true;
    }
  });

  list.addEventListener('dragend', () => {
    draggedCard?.classList.remove('is-dragging');
    draggedCard = null;

    if (orderChanged) void saveCaseOrder(panel, list);
  });

  list.addEventListener('drop', (event) => {
    event.preventDefault();
  });
}

document.querySelectorAll<HTMLElement>('[data-case-order-panel]').forEach(initCaseOrder);
