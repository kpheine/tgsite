export type PublicCaseImage = {
  url: string;
  destaque: boolean;
};

export type PublicCase = {
  id: number;
  title: string;
  client: string | null;
  image: string;
  video: string | null;
  alt: string;
  desafio: string | null;
  entrega: string | null;
  resultado: string | null;
  images: PublicCaseImage[];
};
