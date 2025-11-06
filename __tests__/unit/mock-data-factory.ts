import {
    ApartmentStatus,
    CreateApartmentDto,
} from "@/models/apartment.model";
import { PhotoableType, CreatePhotoDto } from "@/models/photo.model";
import { PlannableType, CreateFloorPlanDto } from "@/models/floor-plan.model";


// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

export const mockApartmentData = (
    overrides: Partial<CreateApartmentDto> = {}
): CreateApartmentDto => ({
    projectId: 2,
    name: `Apartment ${Date.now()}`,
    unitNumber: `U${Math.floor(Math.random() * 1000)}`,
    floorNumber: Math.floor(Math.random() * 10) + 1,
    title: "Luxury Modern Apartment",
    subtitle: "Urban Living at its Finest",
    description: "A beautiful apartment with stunning views",
    areaSqm: 120,
    bedrooms: 3,
    bathrooms: 2,
    price: 250000,
    livingRooms: 1,
    kitchens: 1,
    balconies: 1,
    status: ApartmentStatus.AVAILABLE,
    isModelUnit: false,
    isPublished: false,
    ...overrides
} as CreateApartmentDto);

export const mockPhotoData = (overrides: Partial<CreatePhotoDto> = {}):CreatePhotoDto => ({
    url: `https://example.com/photo-${Date.now()}.jpg`,
    caption: "Test Photo",
    isCover: false,
    photoableType: PhotoableType.APARTMENT,
    photoableId: 2,
    ...overrides
} as CreatePhotoDto);

export const mockFloorPlanData = (overrides: Partial<CreateFloorPlanDto> = {}):CreateFloorPlanDto => ({
    pdfUrl: `https://example.com/plan-${Date.now()}.pdf`,
    name: "Floor Plan",
    plannableType: PlannableType.APARTMENT,
    plannableId: 2,
    ...overrides
} as CreateFloorPlanDto);