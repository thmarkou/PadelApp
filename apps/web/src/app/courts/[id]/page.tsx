"use client";

import { useParams } from "next/navigation";
import { CourtForm } from "../../../components/CourtForm";

export default function EditCourtPage() {
  const params = useParams<{ id: string }>();
  return <CourtForm courtId={params.id} />;
}
