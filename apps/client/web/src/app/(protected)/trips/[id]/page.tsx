'use client';

import { useCallback, useState } from 'react';

import { BookingConfirmation } from '@/components/BookingConfirmation/BookingConfirmation';
import type { BookingLink } from '@/components/BookingLinks/BookingLinks';
import { BookingLinks } from '@/components/BookingLinks/BookingLinks';
import { ChatBox } from '@/components/ChatBox/ChatBox';
import { DailySchedule } from '@/components/DailySchedule/DailySchedule';
import type { ScheduleDay } from '@/components/DailySchedule/DailySchedule';
import { LegList } from '@/components/LegList/LegList';
import type { Leg } from '@/components/LegList/LegList';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Toast } from '@/components/Toast/Toast';
import type { MapPin } from '@/components/TripMap/TripMap';
import { TripMap } from '@/components/TripMap/TripMap';
import { del, get, post, put } from '@/lib/api';
import { getDestinationImage } from '@/lib/destinationImage';
import { downloadICS } from '@/lib/export-ics';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import styles from './tripDetail.module.scss';

const TripPDFButton = dynamic(
  () => import('@/components/TripPDF/TripPDF').then((m) => m.TripPDFButton),
  { ssr: false },
);

interface TripFlight {
  id: string;
  origin: string;
  destination: string;
  airline: string | null;
  flight_number: string | null;
  price: number | null;
  currency: string;
  departure_time: string | null;
  booking_url: string | null;
}

interface TripHotel {
  id: string;
  name: string | null;
  city: string | null;
  price_per_night: number | null;
  total_price: number | null;
  currency: string;
  check_in: string | null;
  check_out: string | null;
  booking_url: string | null;
}

interface TripCarRental {
  id: string;
  provider: string;
  car_name: string;
  car_type: string;
  total_price: number | null;
  currency: string;
  booking_url: string | null;
}

interface TripExperience {
  id: string;
  name: string | null;
  category: string | null;
  estimated_cost: number | null;
  rating: number | null;
}

interface Trip {
  id: string;
  destination: string;
  origin: string | null;
  departure_date: string | null;
  return_date: string | null;
  budget_total: number | null;
  budget_currency: string;
  travelers: number;
  status: string;
  trip_structure?: string;
  flights: TripFlight[];
  hotels: TripHotel[];
  car_rentals: TripCarRental[];
  experiences: TripExperience[];
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'itinerary'>('chat');
  const [bannerImageLoaded, setBannerImageLoaded] = useState(false);

  const {
    data: trip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => get<{ trip: Trip }>(`/trips/${id}`).then((r) => r.trip),
  });

  const { data: legsData } = useQuery({
    queryKey: ['trip-legs', id],
    queryFn: () => get<{ legs: Leg[] }>(`/trips/${id}/legs`),
    enabled: trip?.trip_structure === 'multi_city',
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['trip-schedule', id],
    queryFn: () => get<{ days: ScheduleDay[] }>(`/trips/${id}/schedule`),
    enabled: !!id,
  });

  const handleConfirmBooking = useCallback(async () => {
    try {
      await put(`/trips/${id}`, { status: 'saved' });
      queryClient.setQueryData<Trip>(['trips', id], (old) =>
        old ? { ...old, status: 'saved' } : old,
      );
      await queryClient.invalidateQueries({ queryKey: ['trips', id] });
      setShowConfirmation(false);
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['trips', id] });
      setToastMessage('Failed to save your booking. Please try again.');
      setShowConfirmation(false);
    }
  }, [id, queryClient]);

  const handleCancelBooking = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonLayout}>
          <Skeleton width='60%' height={28} />
          <Skeleton width='100%' height={400} />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className={styles.page}>
        <Link href='/trips' className={styles.back}>
          &larr; Back to trips
        </Link>
        <p>Trip not found.</p>
      </div>
    );
  }

  const toNum = (v: number | string | null | undefined): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const flightTotal = trip.flights.reduce((sum, f) => sum + toNum(f.price), 0);
  const hotelTotal = trip.hotels.reduce(
    (sum, h) => sum + toNum(h.total_price),
    0,
  );
  const carRentalTotal = trip.car_rentals.reduce(
    (sum, c) => sum + toNum(c.total_price),
    0,
  );
  const experienceTotal = trip.experiences.reduce(
    (sum, e) => sum + toNum(e.estimated_cost),
    0,
  );
  const rawAllocated =
    flightTotal + hotelTotal + carRentalTotal + experienceTotal;
  const allocated = Number.isFinite(rawAllocated) ? rawAllocated : 0;
  const remaining =
    trip.budget_total != null && Number.isFinite(trip.budget_total - allocated)
      ? trip.budget_total - allocated
      : null;

  const hasFlights = trip.flights.length > 0;

  const { url } = getDestinationImage(trip.destination);

  // Hotels and experiences don't carry coordinates yet; pins will be populated
  // once the data model includes lat/lng fields.
  const pins: MapPin[] = [];

  const bookingLinks: BookingLink[] = [
    ...trip.flights
      .filter((f) => f.booking_url)
      .map((f) => ({
        id: f.id,
        label:
          `${f.airline ?? ''} ${f.flight_number ?? ''} ${f.origin} to ${f.destination}`.trim(),
        url: f.booking_url!,
        type: 'flight' as const,
      })),
    ...trip.hotels
      .filter((h) => h.booking_url)
      .map((h) => ({
        id: h.id,
        label: h.name ?? 'Hotel',
        url: h.booking_url!,
        type: 'hotel' as const,
      })),
    ...trip.car_rentals
      .filter((c) => c.booking_url)
      .map((c) => ({
        id: c.id,
        label: `${c.provider} ${c.car_name}`,
        url: c.booking_url!,
        type: 'car_rental' as const,
      })),
  ];

  return (
    <div className={styles.page}>
      {/* Full-bleed destination banner */}
      <div className={styles.banner}>
        {url ? (
          <Image
            src={url}
            alt={trip.destination}
            fill
            sizes='100vw'
            style={{
              objectFit: 'cover',
              opacity: bannerImageLoaded ? 1 : 0,
              transition: 'opacity 0.6s ease',
            }}
            priority
            onLoad={() => setBannerImageLoaded(true)}
          />
        ) : (
          <div className={styles.bannerGradient} />
        )}
        <div className={styles.bannerOverlay}>
          <div className={styles.bannerContent}>
            <Link href='/trips' className={styles.back}>
              All trips
            </Link>
            <h1 className={styles.bannerTitle}>{trip.destination}</h1>
            <p className={styles.bannerMeta}>
              {!trip.departure_date && !trip.return_date
                ? 'Dates not set'
                : `${formatShortDate(trip.departure_date)} – ${formatShortDate(trip.return_date)}`}
              {' · '}
              {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'itinerary' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('itinerary')}
        >
          Itinerary
        </button>
      </div>

      {/* Split view */}
      <div className={styles.splitView}>
        {/* Chat pane (left) */}
        <div
          className={`${styles.chatPane} ${activeTab === 'chat' ? styles.paneActive : ''}`}
        >
          <ChatBox
            tripId={trip.id}
            initialDestination={trip.destination}
            hasFlights={hasFlights}
            hasHotels={trip.hotels.length > 0}
            experiencesEmpty={trip.experiences.length === 0}
            carRentalsEmpty={trip.car_rentals.length === 0}
            tripStatus={trip.status}
            onBookTrip={() => setShowConfirmation(true)}
          />
        </div>

        {/* Itinerary pane (right) */}
        <div
          className={`${styles.itineraryPane} ${activeTab === 'itinerary' ? styles.paneActive : ''}`}
        >
          {/* Interactive map */}
          <TripMap pins={pins} destinationName={trip.destination} />

          {/* Export and share */}
          <div className={styles.exportBar}>
            <TripPDFButton
              tripTitle={trip.destination}
              days={scheduleData?.days ?? []}
            />
            <button
              type='button'
              onClick={() =>
                downloadICS(trip.destination, scheduleData?.days ?? [])
              }
            >
              Download Calendar
            </button>
            <button
              type='button'
              onClick={async () => {
                const res = await post<{ share_url: string }>(
                  `/trips/${id}/share`,
                );
                await navigator.clipboard.writeText(res.share_url);
                setToastMessage('Share link copied!');
              }}
            >
              Share
            </button>
          </div>

          {/* Booking links */}
          {bookingLinks.length > 0 && (
            <div data-testid='booking-links' className={styles.scheduleSection}>
              <p className={styles.categoryLabel}>Book Now</p>
              <BookingLinks links={bookingLinks} />
            </div>
          )}

          {/* Multi-city legs */}
          {trip.trip_structure === 'multi_city' && (
            <div data-testid='leg-list' className={styles.legsSection}>
              <p className={styles.categoryLabel}>Trip Legs</p>
              <LegList
                legs={legsData?.legs ?? []}
                onRemoveLeg={(legId) => {
                  void del(`/trips/${id}/legs/${legId}`).then(() =>
                    queryClient.invalidateQueries({
                      queryKey: ['trip-legs', id],
                    }),
                  );
                }}
              />
            </div>
          )}

          {/* Daily schedule */}
          {scheduleData?.days && scheduleData.days.length > 0 && (
            <div
              data-testid='daily-schedule'
              className={styles.scheduleSection}
            >
              <p className={styles.categoryLabel}>Daily Schedule</p>
              <DailySchedule days={scheduleData.days} />
            </div>
          )}

          {/* Budget widget */}
          {trip.budget_total != null && (
            <div className={styles.budgetWidget}>
              <p className={styles.budgetLabel}>Total Budget</p>
              <p className={styles.budgetAmount}>
                {formatCurrency(trip.budget_total, trip.budget_currency)}
              </p>
              {allocated > 0 && (
                <p className={styles.budgetAllocated}>
                  {formatCurrency(allocated, trip.budget_currency)} allocated
                </p>
              )}
              <div className={styles.budgetBar}>
                {flightTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(flightTotal / trip.budget_total) * 100}%`,
                      background: 'var(--ocean)',
                    }}
                  />
                )}
                {hotelTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(hotelTotal / trip.budget_total) * 100}%`,
                      background: 'var(--sand)',
                    }}
                  />
                )}
                {experienceTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(experienceTotal / trip.budget_total) * 100}%`,
                      background: 'var(--lagoon)',
                    }}
                  />
                )}
                {carRentalTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(carRentalTotal / trip.budget_total) * 100}%`,
                      background: 'var(--sunset)',
                    }}
                  />
                )}
              </div>
              <div className={styles.budgetLegend}>
                {flightTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--ocean)' }}
                    />
                    Flights {formatCurrency(flightTotal, trip.budget_currency)}
                  </span>
                )}
                {hotelTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--sand)' }}
                    />
                    Hotels {formatCurrency(hotelTotal, trip.budget_currency)}
                  </span>
                )}
                {experienceTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--lagoon)' }}
                    />
                    Experiences{' '}
                    {formatCurrency(experienceTotal, trip.budget_currency)}
                  </span>
                )}
                {carRentalTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--sunset)' }}
                    />
                    Car Rentals{' '}
                    {formatCurrency(carRentalTotal, trip.budget_currency)}
                  </span>
                )}
                {remaining != null && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--surface)' }}
                    />
                    Remaining {formatCurrency(remaining, trip.budget_currency)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Flights */}
          {trip.flights.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Flights</p>
              {trip.flights.map((f) => (
                <div key={f.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.flights}`}>
                    &#9992;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>
                      {f.airline} {f.flight_number}
                    </p>
                    <p className={styles.itemSubtitle}>
                      {f.origin} &rarr; {f.destination}
                    </p>
                  </div>
                  {f.price != null && (
                    <span className={styles.itemPrice}>
                      {formatCurrency(f.price, f.currency)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Hotels */}
          {trip.hotels.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Hotels</p>
              {trip.hotels.map((h) => (
                <div key={h.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.hotels}`}>
                    &#127976;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>{h.name ?? 'Hotel'}</p>
                    <p className={styles.itemSubtitle}>
                      {h.city}
                      {h.check_in && h.check_out
                        ? ` · ${formatShortDate(h.check_in)} – ${formatShortDate(h.check_out)}`
                        : ''}
                    </p>
                  </div>
                  {h.total_price != null && Number.isFinite(h.total_price) && (
                    <span className={styles.itemPrice}>
                      {formatCurrency(h.total_price, h.currency)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Experiences */}
          {trip.experiences.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Experiences</p>
              {trip.experiences.map((exp) => (
                <div key={exp.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.experiences}`}>
                    &#127919;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>
                      {exp.name ?? 'Experience'}
                    </p>
                    <p className={styles.itemSubtitle}>
                      {exp.category}
                      {exp.rating != null ? ` · ${exp.rating}/5` : ''}
                    </p>
                  </div>
                  {exp.estimated_cost != null && (
                    <span className={styles.itemPrice}>
                      ~{formatCurrency(exp.estimated_cost)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Car Rentals */}
          {trip.car_rentals.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Car Rentals</p>
              {trip.car_rentals.map((c) => (
                <div key={c.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.carRentals}`}>
                    &#128663;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>{c.car_name}</p>
                    <p className={styles.itemSubtitle}>
                      {c.provider} · {c.car_type}
                    </p>
                  </div>
                  {c.total_price != null && Number.isFinite(c.total_price) && (
                    <span className={styles.itemPrice}>
                      {formatCurrency(c.total_price, c.currency)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {trip.flights.length === 0 &&
            trip.hotels.length === 0 &&
            trip.experiences.length === 0 &&
            trip.car_rentals.length === 0 && (
              <div className={styles.emptyState}>
                No itinerary items yet. Use the chat to start planning!
              </div>
            )}

          {/* Save button */}
          {trip.status !== 'saved' && hasFlights && (
            <button
              className={styles.saveButton}
              onClick={() => setShowConfirmation(true)}
            >
              Save Itinerary
            </button>
          )}

          {trip.status === 'saved' && (
            <div className={styles.savedBadge}>Itinerary Saved</div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showConfirmation && (
        <BookingConfirmation
          destination={trip.destination}
          departureDate={trip.departure_date}
          returnDate={trip.return_date}
          flights={trip.flights}
          hotels={trip.hotels}
          carRentals={trip.car_rentals.map((c) => ({
            ...c,
            total_price: Number.isFinite(c.total_price)
              ? (c.total_price ?? 0)
              : 0,
          }))}
          experiences={trip.experiences}
          budgetTotal={trip.budget_total}
          budgetCurrency={trip.budget_currency}
          onConfirm={handleConfirmBooking}
          onCancel={handleCancelBooking}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
