import { memo, useMemo } from "react"
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { useLanguage } from "../context/LanguageContext"
import { AKMOLA_DISTRICTS } from "../data/akmolaDistricts"

// Примерный центр Акмолинской области
const REGION_CENTER = [51.9, 69.4]
const REGION_ZOOM = 7

// Границы, за которые карта не даёт "уехать" панорамированием —
// вычисляются из самих точек области с небольшим запасом по краям,
// чтобы крайние районы не обрезались вплотную к рамке. Внутри этих
// границ можно свободно приближать/отдалять (это не ограничивает
// зум, только за какую область нельзя утащить саму карту).
const REGION_PADDING_DEGREES = 0.6

const REGION_BOUNDS = (() => {

    const lats = AKMOLA_DISTRICTS.map((item) => item.lat)
    const lngs = AKMOLA_DISTRICTS.map((item) => item.lng)

    return [
        [
            Math.min(...lats) - REGION_PADDING_DEGREES,
            Math.min(...lngs) - REGION_PADDING_DEGREES
        ],
        [
            Math.max(...lats) + REGION_PADDING_DEGREES,
            Math.max(...lngs) + REGION_PADDING_DEGREES
        ]
    ]
})()

function normalize(value) {
    return (value || "").toLowerCase().trim()
}

// Сопоставляем свободный текст района/города, который ввёл житель
// (через сайт или бота — там до сих пор бывает и "кокш", и полное
// "Кокшетау"), с одним из известных 20 пунктов области. Совпадение —
// если известное имя района начинается с введённого текста (так
// короткие/неполные варианты вроде "кокш" тоже находят "Кокшетау"),
// либо наоборот.
function findMatchingDistrict(ticketDistrict) {

    const value = normalize(ticketDistrict)

    if (!value) {
        return null
    }

    return AKMOLA_DISTRICTS.find((item) => {
        const itemName = normalize(item.name)
        return itemName.startsWith(value) || value.startsWith(itemName)
    }) || null
}

function buildPointIcon(count) {

    const size = count > 0
        ? Math.min(46, 22 + count * 4)
        : 16

    const background = count > 0 ? "#1B3768" : "#C3CCD9"

    return L.divIcon({
        className: "district-marker-icon",
        html: `
            <div style="
                width:${size}px;
                height:${size}px;
                border-radius:50%;
                background:${background};
                color:#fff;
                display:flex;
                align-items:center;
                justify-content:center;
                font-weight:700;
                font-size:${count > 9 ? 12 : 13}px;
                border:2px solid #fff;
                box-shadow:0 1px 4px rgba(0,0,0,0.35);
            ">${count > 0 ? count : ""}</div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    })
}

function CoverageMap({ tickets = [] }) {

    const { t } = useLanguage()

    const pointsWithCounts = useMemo(() => {

        const counts = new Map(
            AKMOLA_DISTRICTS.map((item) => [item.name, 0])
        )

        tickets.forEach((ticket) => {
            const match = findMatchingDistrict(ticket.district)
            if (match) {
                counts.set(match.name, counts.get(match.name) + 1)
            }
        })

        return AKMOLA_DISTRICTS.map((item) => ({
            ...item,
            count: counts.get(item.name) || 0
        }))

    }, [tickets])

    const totalMatched = pointsWithCounts.reduce(
        (sum, item) => sum + item.count,
        0
    )

    return (
        <div className="coverage-map-card">

            <div className="coverage-map-header">
                <h3>{t("coverage_title")}</h3>
                <span>
                    {totalMatched} {t("coverage_towers_count")}
                </span>
            </div>

            <MapContainer
                center={REGION_CENTER}
                zoom={REGION_ZOOM}
                bounds={REGION_BOUNDS}
                maxBounds={REGION_BOUNDS}
                maxBoundsViscosity={1.0}
                minZoom={7}
                scrollWheelZoom
                className="coverage-map-container"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {pointsWithCounts.map((point) => (
                    <Marker
                        key={point.name}
                        position={[point.lat, point.lng]}
                        icon={buildPointIcon(point.count)}
                    >
                        <Popup>
                            <strong>
                                {point.type === "city" ? "г. " : ""}
                                {point.name}
                                {point.type === "district" ? " р-н" : ""}
                            </strong>
                            <br />
                            {t("coverage_towers_count")}: {point.count}
                        </Popup>
                    </Marker>
                ))}

            </MapContainer>

            <p className="coverage-map-disclaimer">
                {t("coverage_disclaimer")}
            </p>

        </div>
    )
}

export default memo(CoverageMap)
