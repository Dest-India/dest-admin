import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getRoleTerminology(role) {
  switch ((role || "academy").toLowerCase()) {
    case "gym":
      return {
        singular: "Program",
        plural: "Programs",
        searchPlaceholder: "Search by Programs",
        user_singular: "Member",
        user_plural: "Members"
      };
    case "turf":
      return {
        singular: "Turf",
        plural: "Turfs",
        searchPlaceholder: "Search by Turfs",
        user_singular: "Player",
        user_plural: "Players"
      };
    case "academy":
    default:
      return {
        singular: "Course",
        plural: "Courses",
        searchPlaceholder: "Search by Courses",
        user_singular: "Student",
        user_plural: "Students"
      };
  }
}
