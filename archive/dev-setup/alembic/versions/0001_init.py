"""0001_init: Create AUTUS tables

Revision ID: 0001_init
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # events
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_id", sa.String(128), nullable=False),
        sa.Column("entity_type", sa.String(32), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("ts", sa.BigInteger(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("audit_hash", sa.String(64), nullable=False),
        sa.Column("prev_hash", sa.String(64), nullable=True),
    )
    op.create_index("ix_events_entity_id", "events", ["entity_id"])
    op.create_index("ix_events_entity_type", "events", ["entity_type"])
    op.create_index("ix_events_event_type", "events", ["event_type"])
    op.create_index("ix_events_ts", "events", ["ts"])
    op.create_index("ix_events_audit_hash", "events", ["audit_hash"])
    op.create_index("ix_events_entity_ts", "events", ["entity_id", "ts"])

    # shadow_snapshots
    op.create_table(
        "shadow_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_id", sa.String(128), nullable=False),
        sa.Column("entity_type", sa.String(32), nullable=False),
        sa.Column("ts", sa.BigInteger(), nullable=False),
        sa.Column("shadow32f", postgresql.JSONB(), nullable=False),
        sa.Column("planets9", postgresql.JSONB(), nullable=False),
        sa.Column("audit_hash", sa.String(64), nullable=False),
        sa.Column("last_event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_unique_constraint("uq_shadow_snapshots_entity_id", "shadow_snapshots", ["entity_id"])
    op.create_index("ix_shadow_snapshots_entity_id", "shadow_snapshots", ["entity_id"])
    op.create_index("ix_shadow_snapshots_ts", "shadow_snapshots", ["ts"])

    # trace_pairs
    op.create_table(
        "trace_pairs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_id", sa.String(128), nullable=False),
        sa.Column("source_event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("derived_snapshot_hash", sa.String(64), nullable=False),
        sa.Column("ts", sa.BigInteger(), nullable=False),
    )
    op.create_index("ix_trace_pairs_entity_id", "trace_pairs", ["entity_id"])
    op.create_index("ix_trace_pairs_ts", "trace_pairs", ["ts"])


def downgrade() -> None:
    op.drop_table("trace_pairs")
    op.drop_table("shadow_snapshots")
    op.drop_table("events")
