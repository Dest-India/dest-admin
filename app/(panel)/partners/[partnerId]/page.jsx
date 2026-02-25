import { notFound } from "next/navigation";

import { PartnerAnchorScroller } from "@/components/partners/partner-anchor-scroller";
import { PartnerCoursesSection } from "@/components/partners/partner-courses-section";
import { PartnerTurfsSection } from "@/components/partners/partner-turfs-section";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchPartnerDetail } from "@/lib/partners";
import { cn, getRoleTerminology } from "@/lib/utils";
import CopyToClipboard from "@/components/ui/copy-to-clipboard";
import { Play, ZoomIn } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { PreviewDialog } from "@/components/partners/preview-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeleteAccountDialog } from "@/components/account-management/delete-account-dialog";

const typeStyles = {
  academy: "color1",
  gym: "color2",
  turf: "color3",
};

function resolveType(type) {
  if (!type) {
    return typeStyles.academy;
  }

  const key = type.toLowerCase();
  return typeStyles[key] ?? typeStyles.academy;
}

function InfoRow({ label, value }) {
  return (
    <div className="space-y-0 text-sm">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <CopyToClipboard
        text={value}
        className="block max-w-full text-foreground"
      />
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function GallerySection({ gallery }) {
  if (!Array.isArray(gallery) || gallery.length === 0) {
    return null;
  }

  return (
    <Section title="Gallery" className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {gallery.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-xl bg-secondary p-2 overflow-hidden"
          >
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative group size-12 shrink-0 rounded-md border aspect-square overflow-hidden cursor-pointer">
                  {item.type === "video" ? (
                    <iframe
                      src={item.src}
                      title={item.title}
                      className="size-full pointer-events-none"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <img
                      src={item.src}
                      alt={item.title}
                      className="size-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-background md:opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === "video" ? (
                      <Play className="fill-background" />
                    ) : (
                      <ZoomIn />
                    )}
                  </div>
                </div>
              </DialogTrigger>
              <PreviewDialog data={item} />
            </Dialog>
            <div className="w-full flex flex-col">
              <p className="text-sm wrap-break-word break-all line-clamp-1">
                {item.title}
              </p>
              <span className="text-xs text-muted-foreground capitalize">
                {item.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SportsSection({ sports }) {
  if (!Array.isArray(sports) || sports.length === 0) {
    return null;
  }

  return (
    <Section title="Sports" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {sports.map((sport, index) => (
          <Badge key={`${sport}-${index}`} variant="secondary">
            {sport}
          </Badge>
        ))}
      </div>
    </Section>
  );
}

function CoachesSection({ coaches }) {
  if (!Array.isArray(coaches) || coaches.length === 0) {
    return null;
  }

  return (
    <Section title="Coaches" className="space-y-2">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {coaches.map((coach) => (
          <div
            key={coach.id || coach.name}
            className="flex items-start gap-2 rounded-xl bg-secondary p-2"
          >
            <Avatar className="size-12 [&>img]:cursor-pointer">
              <Dialog>
                <DialogTrigger asChild>
                  <AvatarImage src={coach.avatar} alt={coach.name} />
                </DialogTrigger>
                <PreviewDialog
                  data={{
                    src: coach.avatar,
                    title: coach.name,
                    type: "image",
                  }}
                />
              </Dialog>
              <AvatarFallback className="font-semibold">
                {(coach.name || "?").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-sm">
              <p className="text-base font-semibold text-foreground">
                {coach.name}
              </p>
              <Badge variant="info">{coach.sport || "Coach"}</Badge>
              {coach.bio ? (
                <p className="mt-1 text-xs text-muted-foreground leading-normal">
                  {coach.bio}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default async function PartnerDetailPage({ params }) {
  const resolvedParams = await params;
  const partnerId =
    typeof resolvedParams?.partnerId === "string"
      ? resolvedParams.partnerId
      : "";

  if (!partnerId) {
    notFound();
  }

  const partner = await fetchPartnerDetail(partnerId);

  if (!partner) {
    notFound();
  }

  const terminology = getRoleTerminology(partner.role);
  const role = (partner.role || "").toLowerCase();
  const courseAnchorIds = (partner.courses ?? [])
    .map((course) => course.id)
    .filter(Boolean);
  const turfAnchorIds = Array.isArray(partner.turfs) && partner.turfs.length > 0 && role === "turf"
    ? partner.turfs.map((turf) => turf.id).filter(Boolean)
    : [];
  const anchorIds = [...new Set([...courseAnchorIds, ...turfAnchorIds])];
  const statusVariant =
    partner.status === "active"
      ? "success"
      : partner.status === "pending"
      ? "warning"
      : "destructive";

  return (
    <div className="space-y-6">
      <PartnerAnchorScroller anchorIds={anchorIds} />
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4 flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-3 [&>span]:capitalize">
            <h1 className="text-2xl font-semibold text-foreground">
              {partner.name}
            </h1>
            <div className="flex gap-2">
              {partner.role && (
                <Badge variant={resolveType(partner.role)}>
                  {partner.role}
                </Badge>
              )}
              <Badge variant={statusVariant} className="capitalize">
                {partner.status}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-2 [&>p]:flex-1 text-muted-foreground">
            <p>
              <span className="text-xs uppercase">Public ID</span>
              <br />
              {partner.publicId ? (
                <span className="font-medium text-foreground">
                  {partner.publicId}
                </span>
              ) : (
                "Not configured"
              )}
            </p>
            <p>
              Joined {partner.joinedAt}
              <br />
              Last updated on {partner.lastActive}
            </p>
          </div>
          {partner.addressText && (
            <div className="flex flex-col gap-1 text-sm text-foreground">
              <span className="text-xs uppercase text-muted-foreground">
                Address
              </span>
              <p>
                {partner.addressText}{" "}
                {partner.address?.mapLink && (
                  <a
                    href={partner.address.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline underline-offset-4"
                  >
                    Open Map
                  </a>
                )}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2 flex-1 max-w-sm">
          <InfoRow label="Email" value={partner.email} />
          <InfoRow label="WhatsApp" value={partner.whatsapp} />
          <div className="pt-4">
            <DeleteAccountDialog 
              accountId={partner.id}
              accountType="partner"
              accountName={partner.name}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {(() => {
          const firstMetricValue = role === "turf" ? partner.metrics.turfs : partner.metrics.courses;
          const firstMetricDesc = role === "turf" ? "Facilities" : "Total Published";
          const metrics = [
            { label: terminology.plural, value: firstMetricValue, desc: firstMetricDesc },
            { label: "Coaches", value: partner.metrics.coaches, desc: "Active Profiles" },
            { label: "Sports", value: partner.metrics.sports, desc: "Offered" }
          ];

          return metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col gap-1 rounded-xl bg-secondary px-5 py-3"
            >
              <p className="text-xs uppercase text-muted-foreground">
                {metric.label}
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {metric.value}
              </p>
              <p className="text-xs text-muted-foreground">{metric.desc}</p>
            </div>
          ));
        })()}
      </section>

      <SportsSection sports={partner.sports} />

      {partner.about ? (
        <Section title="About" className="space-y-2">
          <div
            className="prose prose-sm max-w-none text-muted-foreground text-sm [&>ul]:list-disc [&>ul,ol]:pt-3 [&>ul,ol]:pl-4 [&>ul,ol]:list-inside [&>ul,ol]:space-y-1 [&>ol]:list-decimal [&>p]:leading-normal [&>p>strong,li>strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: partner.about }}
          />
        </Section>
      ) : null}

      <GallerySection gallery={partner.gallery} />

      {(role === "academy" || role === "gym") && <CoachesSection coaches={partner.coaches} />}

      {role !== "turf" && (
        <Section title={terminology.plural}>
          <PartnerCoursesSection
            courses={partner.courses}
            terminology={terminology}
            partnerId={partner.id}
            batches={partner.batches}
            batch_plans={partner.batch_plans}
            enrollments={partner.enrollments}
          />
        </Section>
      )}

      {role === "turf" && Array.isArray(partner.turfs) && partner.turfs.length > 0 && (
        <Section title="Turfs">
          <PartnerTurfsSection 
            turfs={partner.turfs} 
            partnerId={partner.id}
            turf_courts={partner.turf_courts}
            turf_bookings={partner.turf_bookings}
          />
        </Section>
      )}

      <Separator />
      <div className="flex flex-col text-xs text-muted-foreground">
        <span className="uppercase">Partner ID</span>
        <p className="text-foreground">{partner.id}</p>
      </div>
    </div>
  );
}
