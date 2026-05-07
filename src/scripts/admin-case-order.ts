type OrderConfig = {
  cardSelector: string;
  idAttribute: string;
  endpoint: string;
};

function getOrderCards(container: HTMLElement, config: OrderConfig) {
  return [...container.querySelectorAll<HTMLElement>(config.cardSelector)];
}

function getCardAfterPointer(container: HTMLElement, config: OrderConfig, x: number, y: number) {
  const cards = getOrderCards(container, config).filter((card) => !card.classList.contains('is-dragging'));

  return cards.find((card) => {
    const box = card.getBoundingClientRect();
    const centerX = box.left + box.width / 2;

    if (y < box.top) return true;
    return y <= box.bottom && x < centerX;
  }) || null;
}

async function saveOrder(panel: HTMLElement, list: HTMLElement, config: OrderConfig) {
  const status = panel.querySelector<HTMLElement>('[data-order-status], [data-case-order-status]');
  const ids = getOrderCards(list, config).map((card) => Number(card.dataset[config.idAttribute])).filter(Number.isInteger);

  if (ids.length === 0) return;
  if (status) status.textContent = 'Salvando ordem...';

  try {
    const response = await fetch(config.endpoint, {
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

function initOrder(panel: HTMLElement) {
  const list = panel.querySelector<HTMLElement>('[data-order-list], [data-case-order-list]');
  if (!list) return;

  const hasGenericCards = Boolean(list.querySelector('[data-order-card]'));
  const config: OrderConfig = {
    cardSelector: hasGenericCards ? '[data-order-card]' : '[data-case-card]',
    idAttribute: hasGenericCards ? 'orderId' : 'caseId',
    endpoint: panel.dataset.orderEndpoint || '/api/panel/cases/order',
  };

  let draggedCard: HTMLElement | null = null;
  let orderChanged = false;

  list.addEventListener('dragstart', (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>(config.cardSelector);
    if (!card) return;

    draggedCard = card;
    orderChanged = false;

    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    event.dataTransfer?.setData('text/plain', String(card.dataset[config.idAttribute] || ''));
    event.dataTransfer?.setDragImage(card, offsetX, offsetY);
    requestAnimationFrame(() => card.classList.add('is-dragging'));
  });

  list.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!draggedCard) return;

    const nextCard = getCardAfterPointer(list, config, event.clientX, event.clientY);
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

    if (orderChanged) void saveOrder(panel, list, config);
  });

  list.addEventListener('drop', (event) => {
    event.preventDefault();
  });
}

document.querySelectorAll<HTMLElement>('[data-order-panel], [data-case-order-panel]').forEach(initOrder);

export {};
