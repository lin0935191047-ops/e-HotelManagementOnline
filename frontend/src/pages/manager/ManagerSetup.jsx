import React, { useState } from "react";
import { BedDouble, ConciergeBell, Tag, SlidersHorizontal } from "lucide-react";
import RoomSetup from "./RoomSetup.jsx";
import ServiceSetup from "./ServiceSetup.jsx";
import PromotionSetup from "./PromotionSetup.jsx";

export default function ManagerSetup() {
  const [activeTab, setActiveTab] = useState("rooms");

  const tabs = [
    {
      id: "rooms",
      label: "Quản Lý Phòng Vật Lý",
      icon: BedDouble,
      description: "Cấu hình số phòng, hạng phòng, giá niêm yết và ảnh",
    },
    {
      id: "services",
      label: "Danh Mục Dịch Vụ",
      icon: ConciergeBell,
      description: "Thiết lập đơn giá minibar, ăn uống, giặt ủi, spa...",
    },
    {
      id: "promotions",
      label: "Mã Khuyến Mãi",
      icon: Tag,
      description: "Quản lý coupon giảm giá % hoặc tiền mặt theo thời hạn",
    },
  ];

  return (
    <div>
      {/* Sub-header / Tab Bar */}
      <div
        style={{
          background: "rgba(17, 24, 39, 0.6)",
          borderBottom: "1px solid var(--border-color)",
          backdropFilter: "blur(8px)",
          padding: "1rem 2rem 0",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>Hệ Thống Thiết Lập Khách Sạn (Setup Module)</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                Phân hệ dành riêng cho vai trò <strong>MANAGER</strong>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.75rem 1.25rem",
                    background: isActive ? "rgba(59, 130, 246, 0.12)" : "transparent",
                    color: isActive ? "#60a5fa" : "var(--text-muted)",
                    border: "none",
                    borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                    borderRadius: "8px 8px 0 0",
                    cursor: "pointer",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.875rem",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={17} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "rooms" && <RoomSetup />}
        {activeTab === "services" && <ServiceSetup />}
        {activeTab === "promotions" && <PromotionSetup />}
      </div>
    </div>
  );
}
