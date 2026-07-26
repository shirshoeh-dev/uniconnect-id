import { Link } from "@tanstack/react-router";
import { QrCode } from "./QrCode";
import { GraduationCap } from "lucide-react";

export type StudentRecord = {
  id: string;
  digital_id: string;
  matric_number: string;
  first_name: string;
  last_name: string;
  faculty: string;
  department: string;
  level: string;
  email: string;
  phone: string | null;
  is_active: boolean;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-sm font-semibold leading-tight">{value}</p>
    </div>
  );
}

export function DigitalIdCard({ student, origin }: { student: StudentRecord; origin: string }) {
  const verifyUrl = `${origin}/verify/${student.digital_id}`;

  return (
    <div className="bg-idcard-gradient shadow-elevated overflow-hidden rounded-2xl text-primary-foreground">
      <div className="flex items-center gap-3 border-b border-white/15 px-6 py-4">
        <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
          <GraduationCap className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold leading-tight">University of Delta, Agbor</p>
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
            Unified Digital Credential
          </p>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-70">Student</p>
            <p className="text-xl font-bold leading-tight">
              {student.first_name} {student.last_name}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Matric Number" value={student.matric_number} />
            <Field label="Level" value={student.level} />
            <Field label="Faculty" value={student.faculty} />
            <Field label="Department" value={student.department} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-70">Digital ID</p>
            <p className="font-mono text-sm font-semibold tracking-wide text-accent">
              {student.digital_id}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white p-2">
            <QrCode value={verifyUrl} size={132} />
          </div>
          <Link
            to="/verify/$digitalId"
            params={{ digitalId: student.digital_id }}
            className="text-[11px] font-medium underline underline-offset-4 opacity-90 hover:opacity-100"
          >
            Verify this credential
          </Link>
        </div>
      </div>
    </div>
  );
}
