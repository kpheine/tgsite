import { db, type TestimonialRecord } from './db';

export type PublicTestimonial = {
  id: number;
  title: string;
  quote: string;
  personName: string;
  personRole: string;
};

export function getPublicTestimonials(): PublicTestimonial[] {
  const testimonials = db.prepare(`
    SELECT id, title, quote, person_name, person_role
    FROM testimonials
    WHERE status = 'published'
    ORDER BY sort_order DESC, id DESC
  `).all() as Pick<TestimonialRecord, 'id' | 'title' | 'quote' | 'person_name' | 'person_role'>[];

  return testimonials.map((item) => ({
    id: item.id,
    title: item.title,
    quote: item.quote,
    personName: item.person_name,
    personRole: item.person_role,
  }));
}
