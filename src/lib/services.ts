export type ServiceSlug = "portal" | "library" | "hostel" | "examinations" | "events";

export type Service = {
  slug: ServiceSlug;
  name: string;
  description: string;
};

export const SERVICES: Service[] = [
  {
    slug: "portal",
    name: "Student Portal",
    description: "Course registration, results and academic records.",
  },
  {
    slug: "library",
    name: "Library",
    description: "E-resources, borrowing history and reading rooms.",
  },
  {
    slug: "hostel",
    name: "Hostel",
    description: "Room allocation, hostel fees and gate access.",
  },
  {
    slug: "examinations",
    name: "Examination Portal",
    description: "Exam dockets, timetables and clearance status.",
  },
  {
    slug: "events",
    name: "Campus Events",
    description: "Convocation, seminars and student activities.",
  },
];

export function findService(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
